package br.com.joveretec.chamados.chamado.control;

import br.com.joveretec.chamados.chamado.entity.Acompanhamento;
import br.com.joveretec.chamados.chamado.entity.AcompanhamentoRepository;
import br.com.joveretec.chamados.chamado.entity.Anexo;
import br.com.joveretec.chamados.chamado.entity.AnexoRepository;
import br.com.joveretec.chamados.chamado.entity.CampoHistorico;
import br.com.joveretec.chamados.chamado.entity.Chamado;
import br.com.joveretec.chamados.comum.armazenamento.ArmazenamentoArquivos;
import br.com.joveretec.chamados.comum.armazenamento.AutorizacaoEnvio;
import br.com.joveretec.chamados.comum.erro.ExcecaoDeNegocio;
import br.com.joveretec.chamados.usuario.control.UsuarioService;
import br.com.joveretec.chamados.usuario.entity.Usuario;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Anexos: o binário vai direto do navegador para o armazenamento; aqui ficam autorização,
 * confirmação, links de download e exclusão (banco + armazenamento).
 */
@ApplicationScoped
public class AnexoService {

    private static final Logger LOG = Logger.getLogger(AnexoService.class);
    private static final String TIPO_PADRAO = "application/octet-stream";
    private static final int NOME_MAXIMO = 255;

    private final AnexoRepository anexos;
    private final AcompanhamentoRepository acompanhamentos;
    private final ChamadoService chamados;
    private final UsuarioService usuarios;
    private final HistoricoService historico;
    private final ArmazenamentoArquivos armazenamento;
    private final Duration validadeDownload;
    private final Duration expiracaoPendentes;

    public AnexoService(AnexoRepository anexos, AcompanhamentoRepository acompanhamentos, ChamadoService chamados,
                        UsuarioService usuarios, HistoricoService historico, ArmazenamentoArquivos armazenamento,
                        @ConfigProperty(name = "armazenamento.validade-download") Duration validadeDownload,
                        @ConfigProperty(name = "armazenamento.pendentes.expiram-apos") Duration expiracaoPendentes) {
        this.anexos = anexos;
        this.acompanhamentos = acompanhamentos;
        this.chamados = chamados;
        this.usuarios = usuarios;
        this.historico = historico;
        this.armazenamento = armazenamento;
        this.validadeDownload = validadeDownload;
        this.expiracaoPendentes = expiracaoPendentes;
    }

    /** Pedido do navegador antes do envio. Sem limite de tamanho na aplicação (vale o do Storage). */
    public record PedidoDeEnvio(String nome, String tipoMime, long tamanhoBytes, Long acompanhamentoId) {
    }

    public record EnvioAutorizado(Anexo anexo, AutorizacaoEnvio autorizacao) {
    }

    public record LinkDeDownload(String url, Instant expiraEm) {
    }

    /**
     * Registra o anexo como PENDENTE e autoriza o envio direto ao armazenamento. Anexos de
     * acompanhamento vão para um rascunho do próprio usuário; os da abertura, para o chamado
     * (autor do chamado ou admin).
     */
    @Transactional
    public EnvioAutorizado solicitarEnvio(Long chamadoId, PedidoDeEnvio pedido, Long usuarioId) {
        Usuario usuario = usuarios.buscarAutor(usuarioId);
        Chamado chamado = chamados.buscarParaAlteracao(chamadoId);
        Acompanhamento rascunho = pedido.acompanhamentoId() == null
                ? null
                : rascunhoDoUsuario(chamadoId, pedido.acompanhamentoId(), usuario);
        if (rascunho == null) {
            RegrasDeAutoria.garantir(chamado.getCriadoPor(), usuario,
                    "Só o autor do chamado ou um administrador pode anexar arquivos à abertura.");
        }

        String pasta = CaminhoDoAnexo.pasta(chamado.getProjeto().getId(), chamadoId,
                rascunho == null ? null : rascunho.getId());
        Anexo anexo = new Anexo(chamado, rascunho, nomeOriginal(pedido.nome()), tipoMime(pedido.tipoMime()),
                pedido.tamanhoBytes(), usuario, pasta);
        anexos.persist(anexo);
        anexo.definirCaminho(CaminhoDoAnexo.arquivo(pasta, anexo.getId(), anexo.getNomeOriginal()));
        return new EnvioAutorizado(anexo, armazenamento.autorizarEnvio(anexo.getCaminho(), anexo.getTipoMime()));
    }

    /** Depois do envio: confere o objeto no armazenamento e marca o anexo como CONCLUIDO. */
    @Transactional
    public Anexo confirmar(Long anexoId, Long usuarioId) {
        Usuario usuario = usuarios.buscarAutor(usuarioId);
        Anexo anexo = buscar(anexoId);
        if (!anexo.enviadoPor(usuario)) {
            throw ExcecaoDeNegocio.acessoNegado("Só quem enviou o arquivo pode confirmar o envio.");
        }
        if (anexo.isConcluido()) {
            return anexo;
        }
        chamados.buscarParaAlteracao(anexo.getChamado().getId());
        long tamanho = armazenamento.tamanho(anexo.getCaminho()).orElseThrow(() ->
                ExcecaoDeNegocio.regraDeNegocio("O arquivo ainda não chegou ao armazenamento. Envie-o novamente."));
        anexo.concluir(tamanho);
        if (anexo.isDaAbertura()) {
            registrarNoFeed(anexo, usuario, CampoHistorico.ANEXO_ADICIONADO, null, anexo.getNomeOriginal());
        }
        return anexo;
    }

    /** Link temporário (assinado) para baixar ou pré-visualizar o anexo. */
    public LinkDeDownload linkDeDownload(Long anexoId, boolean inline) {
        Anexo anexo = buscar(anexoId);
        if (!anexo.isConcluido()) {
            throw ExcecaoDeNegocio.naoEncontrado("Anexo não encontrado.");
        }
        String url = armazenamento.urlDeDownload(anexo.getCaminho(), anexo.getNomeOriginal(), inline, validadeDownload);
        return new LinkDeDownload(url, Instant.now().plus(validadeDownload));
    }

    /** Exclui um anexo (quem enviou ou admin), inclusive o objeto no armazenamento. */
    @Transactional
    public void excluir(Long anexoId, Long usuarioId) {
        Usuario usuario = usuarios.buscarAutor(usuarioId);
        Anexo anexo = buscar(anexoId);
        chamados.buscarParaAlteracao(anexo.getChamado().getId());
        RegrasDeAutoria.garantir(anexo.getEnviadoPor(), usuario,
                "Só quem enviou o arquivo ou um administrador pode excluí-lo.");
        boolean visivelNoFeed = anexo.isConcluido()
                && (anexo.isDaAbertura() || !anexo.getAcompanhamento().isRascunho());
        if (visivelNoFeed) {
            registrarNoFeed(anexo, usuario, CampoHistorico.ANEXO_REMOVIDO, anexo.getNomeOriginal(), null);
        }
        excluirTodos(List.of(anexo));
    }

    /**
     * Remove os registros e depois os objetos no armazenamento, na mesma transação: se o
     * armazenamento falhar, nada é apagado do banco.
     */
    @Transactional
    public void excluirTodos(List<Anexo> lista) {
        if (lista.isEmpty()) {
            return;
        }
        lista.forEach(anexos::delete);
        anexos.flush();
        armazenamento.excluir(lista.stream().map(Anexo::getCaminho).toList());
    }

    /**
     * Rotina de limpeza: anexos que ficaram PENDENTES e rascunhos abandonados há mais do que
     * o prazo configurado (24h). Retorna quantos anexos foram removidos.
     */
    @Transactional
    public int limparPendentes() {
        Instant limite = Instant.now().minus(expiracaoPendentes);
        int removidos = 0;
        for (Acompanhamento rascunho : acompanhamentos.rascunhosCriadosAntesDe(limite)) {
            List<Anexo> doRascunho = anexos.doAcompanhamento(rascunho.getId());
            excluirTodos(doRascunho);
            acompanhamentos.delete(rascunho);
            removidos += doRascunho.size();
        }
        List<Anexo> pendentes = anexos.pendentesCriadosAntesDe(limite);
        excluirTodos(pendentes);
        removidos += pendentes.size();
        if (removidos > 0) {
            LOG.infof("Limpeza: %d anexo(s) pendente(s) removido(s).", removidos);
        }
        return removidos;
    }

    private Acompanhamento rascunhoDoUsuario(Long chamadoId, Long acompanhamentoId, Usuario usuario) {
        Acompanhamento acompanhamento = acompanhamentos.buscarCompleto(acompanhamentoId)
                .filter(a -> a.getChamado().getId().equals(chamadoId))
                .orElseThrow(() -> ExcecaoDeNegocio.naoEncontrado("Acompanhamento não encontrado."));
        if (!acompanhamento.isRascunho() || !acompanhamento.pertenceA(usuario)) {
            throw ExcecaoDeNegocio.regraDeNegocio(
                    "Arquivos só podem ser anexados a um novo acompanhamento seu, antes de publicá-lo.");
        }
        return acompanhamento;
    }

    private void registrarNoFeed(Anexo anexo, Usuario usuario, CampoHistorico campo, String antes, String depois) {
        historico.registrarSeAlterado(anexo.getChamado(), usuario, campo, antes, depois);
        chamados.registrarAtividade(anexo.getChamado().getId());
    }

    private Anexo buscar(Long id) {
        return anexos.buscarCompleto(id).orElseThrow(() -> ExcecaoDeNegocio.naoEncontrado("Anexo não encontrado."));
    }

    private static String nomeOriginal(String nome) {
        String limpo = nome == null ? "" : nome.strip();
        if (limpo.isEmpty()) {
            return "arquivo";
        }
        return limpo.length() <= NOME_MAXIMO ? limpo : limpo.substring(limpo.length() - NOME_MAXIMO);
    }

    private static String tipoMime(String tipo) {
        return tipo == null || tipo.isBlank() ? TIPO_PADRAO : tipo.strip();
    }
}
