package br.com.joveretec.chamados.chamado.entity;

import br.com.joveretec.chamados.comum.paginacao.CondicoesConsulta;
import br.com.joveretec.chamados.comum.paginacao.Pagina;
import br.com.joveretec.chamados.comum.paginacao.Paginacao;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Parameters;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class ChamadoRepository implements PanacheRepository<Chamado> {

    private static final String DE_CHAMADO_COM_RELACOES =
            "from Chamado c join fetch c.projeto left join fetch c.responsavel ";
    private static final String ORDENACAO_PADRAO = " order by c.urgenciaPeso desc, c.posicao, c.id";

    /** Busca o chamado já com projeto, responsável e autor carregados (uma única consulta). */
    public Optional<Chamado> buscarCompleto(Long id) {
        return find(DE_CHAMADO_COM_RELACOES + "join fetch c.criadoPor where c.id = ?1", id)
                .firstResultOptional();
    }

    public Pagina<Chamado> listar(FiltroChamados filtro, Paginacao paginacao) {
        CondicoesConsulta condicoes = condicoesDo(filtro);
        List<Chamado> itens = find(DE_CHAMADO_COM_RELACOES + "where " + condicoes.where() + ORDENACAO_PADRAO,
                condicoes.parametros())
                .page(paginacao.pagina(), paginacao.tamanho())
                .list();
        long total = count("from Chamado c where " + condicoes.where(), condicoes.parametros());
        return Pagina.de(itens, total, paginacao);
    }

    public int proximaPosicao(Long projetoId) {
        return (int) count("projeto.id", projetoId) + 1;
    }

    /** Soma {@code delta} à posição dos chamados do projeto no intervalo informado, exceto o chamado movido. */
    public void deslocarPosicoes(Long projetoId, int de, int ate, int delta, Long excetoChamadoId) {
        update("posicao = posicao + :delta where projeto.id = :projetoId and posicao between :de and :ate"
                        + " and id <> :excetoId",
                Parameters.with("delta", delta).and("projetoId", projetoId)
                        .and("de", de).and("ate", ate).and("excetoId", excetoChamadoId));
    }

    public List<ContagemPorStatus> contarPorStatus(FiltroChamados filtro) {
        return agregar("select new " + ContagemPorStatus.class.getName() + "(c.status, count(c))",
                "group by c.status", filtro, ContagemPorStatus.class);
    }

    public List<ContagemPorUrgencia> contarPorUrgencia(FiltroChamados filtro) {
        return agregar("select new " + ContagemPorUrgencia.class.getName() + "(c.urgencia, count(c))",
                "group by c.urgencia", filtro, ContagemPorUrgencia.class);
    }

    public List<ContagemPorResponsavel> contarPorResponsavel(FiltroChamados filtro) {
        return agregar("select new " + ContagemPorResponsavel.class.getName()
                        + "(r.id, r.nome, c.status, count(c))",
                "group by r.id, r.nome, c.status order by r.nome, r.id", filtro, ContagemPorResponsavel.class,
                "join c.responsavel r ");
    }

    private <T> List<T> agregar(String select, String agrupamento, FiltroChamados filtro, Class<T> tipo) {
        return agregar(select, agrupamento, filtro, tipo, "");
    }

    private <T> List<T> agregar(String select, String agrupamento, FiltroChamados filtro, Class<T> tipo,
                                String joins) {
        CondicoesConsulta condicoes = condicoesDo(filtro);
        var consulta = getEntityManager().createQuery(
                select + " from Chamado c " + joins + "where " + condicoes.where() + " " + agrupamento, tipo);
        condicoes.parametros().map().forEach(consulta::setParameter);
        return consulta.getResultList();
    }

    private CondicoesConsulta condicoesDo(FiltroChamados filtro) {
        return new CondicoesConsulta()
                .igual("c.projeto.id = :projetoId", "projetoId", filtro.projetoId())
                .igual("c.responsavel.id = :responsavelId", "responsavelId", filtro.responsavelId())
                .se(filtro.semResponsavel(), "c.responsavel is null")
                .em("c.status in :status", "status", filtro.status())
                .em("c.urgencia in :urgencias", "urgencias", filtro.urgencias())
                .contem("(lower(c.titulo) like :busca or lower(c.descricao) like :busca)", "busca", filtro.busca());
    }
}
