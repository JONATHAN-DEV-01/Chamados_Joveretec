package br.com.joveretec.chamados.projeto.control;

import br.com.joveretec.chamados.comum.erro.ExcecaoDeNegocio;
import br.com.joveretec.chamados.comum.paginacao.Pagina;
import br.com.joveretec.chamados.comum.paginacao.Paginacao;
import br.com.joveretec.chamados.projeto.entity.Projeto;
import br.com.joveretec.chamados.projeto.entity.ProjetoRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class ProjetoService {

    private static final String NAO_ENCONTRADO = "Projeto não encontrado.";

    private final ProjetoRepository projetos;

    public ProjetoService(ProjetoRepository projetos) {
        this.projetos = projetos;
    }

    public Pagina<Projeto> listar(String busca, boolean incluirArquivados, Paginacao paginacao) {
        return Pagina.de(projetos.listar(busca, incluirArquivados), paginacao);
    }

    public Projeto buscar(Long id) {
        return projetos.findByIdOptional(id).orElseThrow(() -> ExcecaoDeNegocio.naoEncontrado(NAO_ENCONTRADO));
    }

    /**
     * Busca o projeto com bloqueio de escrita (serializa alterações na fila de chamados)
     * e garante que ele aceita alterações.
     */
    public Projeto buscarAtivoParaAlteracao(Long id) {
        Projeto projeto = projetos.buscarComBloqueio(id)
                .orElseThrow(() -> ExcecaoDeNegocio.naoEncontrado(NAO_ENCONTRADO));
        if (projeto.isArquivado()) {
            throw ExcecaoDeNegocio.regraDeNegocio("O projeto está arquivado e não aceita alterações em chamados.");
        }
        return projeto;
    }

    @Transactional
    public Projeto criar(String nome, String descricao) {
        garantirNomeDisponivel(nome, null);
        Projeto projeto = new Projeto(nome, descricao);
        projetos.persist(projeto);
        return projeto;
    }

    @Transactional
    public Projeto atualizar(Long id, String nome, String descricao) {
        Projeto projeto = buscar(id);
        garantirNomeDisponivel(nome, id);
        projeto.atualizarDados(nome, descricao);
        return projeto;
    }

    @Transactional
    public Projeto arquivar(Long id) {
        Projeto projeto = buscar(id);
        projeto.arquivar();
        return projeto;
    }

    @Transactional
    public Projeto desarquivar(Long id) {
        Projeto projeto = buscar(id);
        projeto.desarquivar();
        return projeto;
    }

    private void garantirNomeDisponivel(String nome, Long ignorarId) {
        if (projetos.nomeEmUso(nome, ignorarId)) {
            throw ExcecaoDeNegocio.conflito("Já existe um projeto com este nome.");
        }
    }
}
