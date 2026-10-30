package br.com.joveretec.chamados.chamado.control;

import br.com.joveretec.chamados.chamado.entity.AcompanhamentoRepository;
import br.com.joveretec.chamados.chamado.entity.CampoHistorico;
import br.com.joveretec.chamados.chamado.entity.Chamado;
import br.com.joveretec.chamados.chamado.entity.ChamadoRepository;
import br.com.joveretec.chamados.chamado.entity.FiltroChamados;
import br.com.joveretec.chamados.chamado.entity.HistoricoChamado;
import br.com.joveretec.chamados.chamado.entity.OrdemChamados;
import br.com.joveretec.chamados.chamado.entity.StatusChamado;
import br.com.joveretec.chamados.comum.erro.ExcecaoDeNegocio;
import br.com.joveretec.chamados.comum.paginacao.Pagina;
import br.com.joveretec.chamados.comum.paginacao.Paginacao;
import br.com.joveretec.chamados.projeto.control.ProjetoService;
import br.com.joveretec.chamados.projeto.entity.Projeto;
import br.com.joveretec.chamados.usuario.control.UsuarioService;
import br.com.joveretec.chamados.usuario.entity.Usuario;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Set;

@ApplicationScoped
public class ChamadoService {

    private static final Logger LOG = Logger.getLogger(ChamadoService.class);

    private final ChamadoRepository chamados;
    private final AcompanhamentoRepository acompanhamentos;
    private final HistoricoService historico;
    private final ProjetoService projetos;
    private final UsuarioService usuarios;

    public ChamadoService(ChamadoRepository chamados, AcompanhamentoRepository acompanhamentos,
                          HistoricoService historico, ProjetoService projetos, UsuarioService usuarios) {
        this.chamados = chamados;
        this.acompanhamentos = acompanhamentos;
        this.historico = historico;
        this.projetos = projetos;
        this.usuarios = usuarios;
    }

    public Pagina<Chamado> listar(FiltroChamados filtro, OrdemChamados ordem, Paginacao paginacao) {
        return chamados.listar(filtro, ordem, paginacao);
    }

    public Chamado buscar(Long id) {
        return chamados.buscarCompleto(id)
                .orElseThrow(() -> ExcecaoDeNegocio.naoEncontrado("Chamado não encontrado."));
    }

    /** Soma do tempo gasto informado nos acompanhamentos publicados. */
    public long tempoGastoTotalMinutos(Long chamadoId) {
        return acompanhamentos.tempoGastoTotalMinutos(chamadoId);
    }

    /** Atualiza a "última atividade" do chamado sem alterar a versão (lock otimista). */
    public void registrarAtividade(Long chamadoId) {
        chamados.registrarAtividade(chamadoId);
    }

    public Pagina<HistoricoChamado> historico(Long chamadoId, Paginacao paginacao) {
        buscar(chamadoId);
        return historico.listar(chamadoId, paginacao);
    }

    @Transactional
    public Chamado criar(NovoChamado dados, Long autorId) {
        Usuario autor = usuarios.buscarAutor(autorId);
        Projeto projeto = projetos.buscarAtivoParaAlteracao(dados.projetoId());
        List<Usuario> responsaveis = dados.responsavelIds().stream().map(usuarios::buscarResponsavel).toList();

        int fimDaFila = chamados.proximaPosicao(projeto.getId());
        int posicao = dados.posicao() == null ? fimDaFila : validarPosicao(dados.posicao(), fimDaFila);
        chamados.deslocarPosicoes(projeto.getId(), posicao, fimDaFila - 1, +1);

        Chamado chamado = new Chamado(projeto, dados.titulo(), dados.descricao(), dados.urgencia(),
                responsaveis, autor, posicao);
        chamados.persist(chamado);
        historico.registrarCriacao(chamado, autor);
        LOG.infof("Chamado id=%d criado no projeto id=%d pelo usuário id=%d.", chamado.getId(), projeto.getId(), autorId);
        return chamado;
    }

    @Transactional
    public Chamado editar(Long id, EdicaoChamado dados, Long autorId) {
        Usuario autor = usuarios.buscarAutor(autorId);
        Chamado chamado = buscarParaAlteracao(id);
        if (chamado.getVersao() != dados.versao()) {
            throw ExcecaoDeNegocio.conflito(
                    "O chamado foi alterado por outra pessoa. Recarregue e tente novamente.");
        }
        List<Usuario> responsaveis = responsaveisDaEdicao(chamado, dados.responsavelIds());

        historico.registrarSeAlterado(chamado, autor, CampoHistorico.TITULO, chamado.getTitulo(), dados.titulo().trim());
        historico.registrarSeAlterado(chamado, autor, CampoHistorico.DESCRICAO, chamado.getDescricao(), dados.descricao());
        historico.registrarSeAlterado(chamado, autor, CampoHistorico.URGENCIA, chamado.getUrgencia(), dados.urgencia());
        historico.registrarResponsaveis(chamado, autor, chamado.getResponsaveis(), responsaveis);

        chamado.alterarTitulo(dados.titulo());
        chamado.alterarDescricao(dados.descricao());
        chamado.alterarUrgencia(dados.urgencia());
        chamado.definirResponsaveis(responsaveis);
        return chamado;
    }

    @Transactional
    public Chamado alterarStatus(Long id, StatusChamado status, Long autorId) {
        Usuario autor = usuarios.buscarAutor(autorId);
        Chamado chamado = buscarParaAlteracao(id);
        historico.registrarSeAlterado(chamado, autor, CampoHistorico.STATUS, chamado.getStatus(), status);
        chamado.alterarStatus(status);
        return chamado;
    }

    /** Inclui quem chamou entre os responsáveis, sem tirar os demais (nada muda se já era um deles). */
    @Transactional
    public Chamado atribuirAoAutor(Long id, Long autorId) {
        Usuario autor = usuarios.buscarAutor(autorId);
        Chamado chamado = buscarParaAlteracao(id);
        List<Usuario> antes = chamado.getResponsaveis();
        if (chamado.adicionarResponsavel(autor)) {
            historico.registrarResponsaveis(chamado, autor, antes, chamado.getResponsaveis());
        }
        return chamado;
    }

    @Transactional
    public Chamado reordenar(Long id, int novaPosicao, Long autorId) {
        Usuario autor = usuarios.buscarAutor(autorId);
        Chamado chamado = buscar(id);
        Long projetoId = chamado.getProjeto().getId();
        projetos.buscarAtivoParaAlteracao(projetoId);
        chamados.recarregar(chamado);

        int atual = chamado.getPosicao();
        int destino = validarPosicao(novaPosicao, chamados.proximaPosicao(projetoId) - 1);
        if (destino < atual) {
            chamados.deslocarPosicoes(projetoId, destino, atual - 1, +1);
        } else {
            chamados.deslocarPosicoes(projetoId, atual + 1, destino, -1);
        }
        historico.registrarSeAlterado(chamado, autor, CampoHistorico.POSICAO, atual, destino);
        chamado.moverParaPosicao(destino);
        return chamado;
    }

    /** Carrega o chamado com suas relações e garante que o projeto dele não está arquivado. */
    public Chamado buscarParaAlteracao(Long id) {
        Chamado chamado = buscar(id);
        if (chamado.getProjeto().isArquivado()) {
            throw ExcecaoDeNegocio.regraDeNegocio("O projeto está arquivado e não aceita alterações em chamados.");
        }
        return chamado;
    }

    /**
     * Quem já era responsável continua aceito mesmo se tiver sido desativado depois (a edição
     * não o remove à força); quem está entrando precisa estar ativo.
     */
    private List<Usuario> responsaveisDaEdicao(Chamado chamado, Set<Long> ids) {
        return ids.stream()
                .map(idUsuario -> chamado.getResponsaveis().stream()
                        .filter(atual -> atual.getId().equals(idUsuario))
                        .findFirst()
                        .orElseGet(() -> usuarios.buscarResponsavel(idUsuario)))
                .toList();
    }

    private static int validarPosicao(int posicao, int maxima) {
        if (posicao < 1 || posicao > maxima) {
            throw ExcecaoDeNegocio.regraDeNegocio("A posição deve estar entre 1 e " + maxima + ".");
        }
        return posicao;
    }
}
