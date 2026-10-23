package br.com.joveretec.chamados.chamado.control;

import br.com.joveretec.chamados.chamado.entity.Acompanhamento;
import br.com.joveretec.chamados.chamado.entity.Acompanhamento.DadosAcompanhamento;
import br.com.joveretec.chamados.chamado.entity.AcompanhamentoRepository;
import br.com.joveretec.chamados.chamado.entity.Anexo;
import br.com.joveretec.chamados.chamado.entity.AnexoRepository;
import br.com.joveretec.chamados.chamado.entity.Chamado;
import br.com.joveretec.chamados.chamado.entity.StatusChamado;
import br.com.joveretec.chamados.chamado.entity.TipoAcompanhamento;
import br.com.joveretec.chamados.comum.erro.ExcecaoDeNegocio;
import br.com.joveretec.chamados.usuario.control.UsuarioService;
import br.com.joveretec.chamados.usuario.entity.Usuario;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.util.List;

@ApplicationScoped
public class AcompanhamentoService {

    private static final Logger LOG = Logger.getLogger(AcompanhamentoService.class);

    private final AcompanhamentoRepository acompanhamentos;
    private final AnexoRepository anexos;
    private final AnexoService servicoDeAnexos;
    private final ChamadoService chamados;
    private final UsuarioService usuarios;

    public AcompanhamentoService(AcompanhamentoRepository acompanhamentos, AnexoRepository anexos,
                                 AnexoService servicoDeAnexos, ChamadoService chamados, UsuarioService usuarios) {
        this.acompanhamentos = acompanhamentos;
        this.anexos = anexos;
        this.servicoDeAnexos = servicoDeAnexos;
        this.chamados = chamados;
        this.usuarios = usuarios;
    }

    /** Acompanhamento com os anexos concluídos, como aparece no feed. */
    public record ComAnexos(Acompanhamento acompanhamento, List<Anexo> anexos) {
    }

    /** Dados para publicar; {@code rascunhoId} quando há anexos já enviados para um rascunho. */
    public record NovoAcompanhamento(DadosAcompanhamento dados, boolean concluirChamado, Long rascunhoId) {
    }

    /** Cria o rascunho que recebe os anexos antes da publicação (o caminho no Storage usa o id dele). */
    @Transactional
    public Acompanhamento criarRascunho(Long chamadoId, Long autorId) {
        Usuario autor = usuarios.buscarAutor(autorId);
        Chamado chamado = chamados.buscarParaAlteracao(chamadoId);
        Acompanhamento rascunho = Acompanhamento.rascunho(chamado, autor);
        acompanhamentos.persist(rascunho);
        return rascunho;
    }

    @Transactional
    public ComAnexos publicar(Long chamadoId, NovoAcompanhamento novo, Long autorId) {
        DadosAcompanhamento dados = novo.dados();
        if (novo.concluirChamado() && dados.tipo() != TipoAcompanhamento.SOLUCAO) {
            throw ExcecaoDeNegocio.regraDeNegocio("Só um acompanhamento do tipo Solução pode concluir o chamado.");
        }
        Usuario autor = usuarios.buscarAutor(autorId);
        Chamado chamado = chamados.buscarParaAlteracao(chamadoId);

        Acompanhamento acompanhamento = novo.rascunhoId() == null
                ? novoPublicado(chamado, autor, dados)
                : publicarRascunho(chamadoId, novo.rascunhoId(), autor, dados);
        chamados.registrarAtividade(chamadoId);
        if (novo.concluirChamado() && chamado.getStatus() != StatusChamado.CONCLUIDO) {
            chamados.alterarStatus(chamadoId, StatusChamado.CONCLUIDO, autorId);
        }
        LOG.infof("Acompanhamento id=%d publicado no chamado id=%d.", acompanhamento.getId(), chamadoId);
        return comAnexos(acompanhamento);
    }

    @Transactional
    public ComAnexos editar(Long chamadoId, Long id, DadosAcompanhamento dados, Long usuarioId) {
        Acompanhamento acompanhamento = buscarParaAlterar(chamadoId, id, usuarioId);
        acompanhamento.editar(dados);
        chamados.registrarAtividade(chamadoId);
        return comAnexos(acompanhamento);
    }

    /** Exclui o acompanhamento e seus anexos (banco e Storage). */
    @Transactional
    public void excluir(Long chamadoId, Long id, Long usuarioId) {
        Acompanhamento acompanhamento = buscarParaAlterar(chamadoId, id, usuarioId);
        servicoDeAnexos.excluirTodos(anexos.doAcompanhamento(id));
        acompanhamentos.delete(acompanhamento);
        chamados.registrarAtividade(chamadoId);
        LOG.infof("Acompanhamento id=%d excluído pelo usuário id=%d.", id, usuarioId);
    }

    private Acompanhamento novoPublicado(Chamado chamado, Usuario autor, DadosAcompanhamento dados) {
        Acompanhamento acompanhamento = Acompanhamento.publicado(chamado, autor, dados);
        acompanhamentos.persist(acompanhamento);
        return acompanhamento;
    }

    private Acompanhamento publicarRascunho(Long chamadoId, Long rascunhoId, Usuario autor, DadosAcompanhamento dados) {
        Acompanhamento rascunho = buscarDoChamado(chamadoId, rascunhoId);
        if (!rascunho.isRascunho() || !rascunho.pertenceA(autor)) {
            throw ExcecaoDeNegocio.regraDeNegocio("Rascunho inválido para este usuário.");
        }
        boolean envioPendente = anexos.doAcompanhamento(rascunhoId).stream().anyMatch(a -> !a.isConcluido());
        if (envioPendente) {
            throw ExcecaoDeNegocio.regraDeNegocio(
                    "Ainda há anexos sendo enviados. Aguarde o fim dos envios ou remova os arquivos pendentes.");
        }
        rascunho.publicar(dados);
        return rascunho;
    }

    /** Publicado, do chamado informado, em projeto ativo e com permissão de autoria. */
    private Acompanhamento buscarParaAlterar(Long chamadoId, Long id, Long usuarioId) {
        Usuario usuario = usuarios.buscarAutor(usuarioId);
        chamados.buscarParaAlteracao(chamadoId);
        Acompanhamento acompanhamento = buscarDoChamado(chamadoId, id);
        if (acompanhamento.isRascunho()) {
            throw ExcecaoDeNegocio.naoEncontrado("Acompanhamento não encontrado.");
        }
        RegrasDeAutoria.garantir(acompanhamento.getAutor(), usuario,
                "Só o autor ou um administrador pode alterar este acompanhamento.");
        return acompanhamento;
    }

    private Acompanhamento buscarDoChamado(Long chamadoId, Long id) {
        return acompanhamentos.buscarCompleto(id)
                .filter(a -> a.getChamado().getId().equals(chamadoId))
                .orElseThrow(() -> ExcecaoDeNegocio.naoEncontrado("Acompanhamento não encontrado."));
    }

    private ComAnexos comAnexos(Acompanhamento acompanhamento) {
        List<Anexo> concluidos = acompanhamento.getId() == null
                ? List.of()
                : anexos.concluidosDosAcompanhamentos(List.of(acompanhamento.getId()));
        return new ComAnexos(acompanhamento, concluidos);
    }
}
