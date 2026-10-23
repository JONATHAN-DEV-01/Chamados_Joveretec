package br.com.joveretec.chamados.chamado.entity;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Feed unificado do chamado. Uma única consulta (UNION ALL) ordena e pagina apenas as referências
 * (tipo, id, data) de: abertura (o próprio chamado), acompanhamentos publicados e eventos do
 * histórico. Os detalhes de cada página são carregados depois em lote, sem N+1.
 */
@ApplicationScoped
public class FeedRepository {

    public enum TipoItem {
        ABERTURA,
        ACOMPANHAMENTO,
        EVENTO
    }

    public enum Ordem {
        ASC,
        DESC
    }

    public record Referencia(TipoItem tipo, long id, Instant data) {
    }

    // A criação do chamado já aparece como item ABERTURA, então o evento CRIACAO fica de fora.
    // "prioridade" garante a abertura antes de qualquer item com o mesmo instante.
    private static final String ITENS = """
            select 'ABERTURA' as tipo, 0 as prioridade, c.id as ref_id, c.criado_em as data
              from chamado c where c.id = :chamadoId
            union all
            select 'ACOMPANHAMENTO', 1, a.id, a.criado_em
              from acompanhamento a where a.chamado_id = :chamadoId and a.situacao = 'PUBLICADO'
            union all
            select 'EVENTO', 1, h.id, h.alterado_em
              from historico_chamado h where h.chamado_id = :chamadoId and h.campo <> 'CRIACAO'
            """;

    private final EntityManager entityManager;

    public FeedRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public List<Referencia> listar(Long chamadoId, Ordem ordem, int pagina, int tamanho) {
        String direcao = ordem == Ordem.ASC ? "asc" : "desc";
        Query consulta = entityManager.createNativeQuery("select tipo, ref_id, data from (" + ITENS + ") feed"
                + " order by data " + direcao + ", prioridade " + direcao + ", ref_id " + direcao)
                .setParameter("chamadoId", chamadoId)
                .setFirstResult(pagina * tamanho)
                .setMaxResults(tamanho);
        @SuppressWarnings("unchecked")
        List<Object[]> linhas = consulta.getResultList();
        return linhas.stream()
                .map(l -> new Referencia(TipoItem.valueOf((String) l[0]), ((Number) l[1]).longValue(), instante(l[2])))
                .toList();
    }

    public long contar(Long chamadoId) {
        Object total = entityManager.createNativeQuery("select count(*) from (" + ITENS + ") feed")
                .setParameter("chamadoId", chamadoId)
                .getSingleResult();
        return ((Number) total).longValue();
    }

    private static Instant instante(Object valor) {
        return switch (valor) {
            case Instant i -> i;
            case OffsetDateTime o -> o.toInstant();
            case Timestamp t -> t.toInstant();
            default -> throw new IllegalStateException("Tipo de data inesperado no feed: " + valor.getClass());
        };
    }
}
