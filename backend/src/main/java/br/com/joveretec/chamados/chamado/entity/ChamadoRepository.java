package br.com.joveretec.chamados.chamado.entity;

import br.com.joveretec.chamados.comum.paginacao.CondicoesConsulta;
import br.com.joveretec.chamados.comum.paginacao.Pagina;
import br.com.joveretec.chamados.comum.paginacao.Paginacao;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Parameters;
import jakarta.enterprise.context.ApplicationScoped;
import org.hibernate.Hibernate;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class ChamadoRepository implements PanacheRepository<Chamado> {

    private static final String DE_CHAMADO_COM_RELACOES = "from Chamado c join fetch c.projeto ";

    /** Condição "o usuário :parametro é um dos responsáveis do chamado c". */
    public static String temResponsavel(String parametro) {
        return "exists (select 1 from c.responsaveis resp where resp.id = :" + parametro + ")";
    }

    /** Condição "o chamado c não foi excluído" (os excluídos não aparecem em nenhuma tela). */
    public static final String NAO_EXCLUIDO = "c.excluidoEm is null";

    /**
     * Busca o chamado já com projeto, autor e responsáveis carregados (uma única consulta).
     * Chamado excluído conta como inexistente.
     */
    public Optional<Chamado> buscarCompleto(Long id) {
        return find(DE_CHAMADO_COM_RELACOES + "join fetch c.criadoPor left join fetch c.responsaveis where c.id = ?1 and "
                + NAO_EXCLUIDO, id)
                .firstResultOptional();
    }

    public Pagina<Chamado> listar(FiltroChamados filtro, OrdemChamados ordem, Paginacao paginacao) {
        CondicoesConsulta condicoes = condicoesDo(filtro);
        List<Chamado> itens = find(DE_CHAMADO_COM_RELACOES + "where " + condicoes.where() + ordem.orderBy(),
                condicoes.parametros())
                .page(paginacao.pagina(), paginacao.tamanho())
                .list();
        carregarResponsaveis(itens);
        long total = count("from Chamado c where " + condicoes.where(), condicoes.parametros());
        return Pagina.de(itens, total, paginacao);
    }

    /**
     * Os responsáveis (coleção) ficam fora do join fetch da listagem para a paginação continuar
     * no banco. Tocar a coleção do primeiro carrega a de todos da página numa única consulta
     * (@BatchSize), ainda com a sessão aberta.
     */
    private static void carregarResponsaveis(List<Chamado> chamados) {
        chamados.forEach(c -> Hibernate.initialize(c.responsaveisParaCarga()));
    }

    /** Primeira posição livre no fim da fila do projeto (a fila só tem chamados ativos). */
    public int proximaPosicao(Long projetoId) {
        return (int) count("projeto.id = ?1 and posicao is not null", projetoId) + 1;
    }

    /**
     * Soma {@code delta} à posição dos chamados do projeto cujas posições estão no intervalo [de, ate]
     * (concluídos, sem posição, ficam de fora).
     */
    public void deslocarPosicoes(Long projetoId, int de, int ate, int delta) {
        if (de > ate) {
            return;
        }
        update("posicao = posicao + :delta where projeto.id = :projetoId and posicao between :de and :ate",
                Parameters.with("delta", delta).and("projetoId", projetoId).and("de", de).and("ate", ate));
    }

    /** Marca atividade recente no chamado sem incrementar a versão (evita 409 em quem está editando). */
    public void registrarAtividade(Long chamadoId) {
        update("ultimaAtividadeEm = ?1 where id = ?2", Instant.now(), chamadoId);
    }

    /** Relê o chamado do banco (usado após bloquear o projeto, para obter a posição atual). */
    public void recarregar(Chamado chamado) {
        getEntityManager().refresh(chamado);
        Hibernate.initialize(chamado.responsaveisParaCarga()); // o refresh descarta a coleção carregada
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
                "join c.responsaveis r ");
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
                .se(true, NAO_EXCLUIDO)
                .igual("c.projeto.id = :projetoId", "projetoId", filtro.projetoId())
                .igual(temResponsavel("responsavelId"), "responsavelId", filtro.responsavelId())
                .se(filtro.semResponsavel(), "c.responsaveis is empty")
                .em("c.status in :status", "status", filtro.status())
                .em("c.urgencia in :urgencias", "urgencias", filtro.urgencias())
                .contem("(lower(c.titulo) like :busca or lower(c.descricao) like :busca)", "busca", filtro.busca());
    }
}
