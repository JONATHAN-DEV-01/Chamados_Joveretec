package br.com.joveretec.chamados.chamado.entity;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Tempo de cada chamado, calculado a partir dos eventos de status do histórico (tempo corrido).
 * <ul>
 *   <li><b>total</b>: da abertura até a última conclusão, ou até agora se não está concluído;</li>
 *   <li><b>em andamento</b>: soma dos trechos em {@code EM_ANDAMENTO} (o trecho atual conta até agora).</li>
 * </ul>
 * Chamado concluído sem nenhum evento de status (dado antigo) usa {@code atualizado_em} como conclusão.
 */
@ApplicationScoped
public class TemposRepository {

    /**
     * {@code %s} = condição sobre {@code c} (e um sufixo opcional, como ORDER BY/LIMIT).
     * Resultado: CTE {@code tempos(chamado_id, total_segundos, andamento_segundos)} e {@code alvo}.
     */
    private static final String TEMPOS = """
            WITH alvo AS (
                SELECT c.id, c.titulo, c.status, c.urgencia, c.criado_em, c.atualizado_em
                  FROM chamado c
                 WHERE %s
            ),
            eventos AS (
                SELECT h.chamado_id, h.alterado_em, h.valor_anterior, h.valor_novo,
                       row_number() OVER (PARTITION BY h.chamado_id ORDER BY h.alterado_em, h.id) AS n
                  FROM historico_chamado h
                  JOIN alvo a ON a.id = h.chamado_id
                 WHERE h.campo = 'STATUS'
            ),
            trechos AS (
                SELECT a.id AS chamado_id, a.criado_em AS inicio, 0 AS n,
                       coalesce(e.valor_anterior,
                                CASE WHEN a.status = 'CONCLUIDO' THEN 'ABERTO' ELSE a.status END) AS status
                  FROM alvo a
                  LEFT JOIN eventos e ON e.chamado_id = a.id AND e.n = 1
                UNION ALL
                SELECT chamado_id, alterado_em, n, valor_novo FROM eventos
                UNION ALL
                SELECT a.id, greatest(a.atualizado_em, a.criado_em), 1, 'CONCLUIDO'
                  FROM alvo a
                 WHERE a.status = 'CONCLUIDO'
                   AND NOT EXISTS (SELECT 1 FROM eventos e WHERE e.chamado_id = a.id)
            ),
            limites AS (
                SELECT chamado_id, status, inicio,
                       lead(inicio) OVER (PARTITION BY chamado_id ORDER BY n) AS fim
                  FROM trechos
            ),
            tempos AS (
                SELECT l.chamado_id,
                       floor(extract(EPOCH FROM
                             coalesce(max(l.inicio) FILTER (WHERE l.fim IS NULL AND l.status = 'CONCLUIDO'), now())
                             - min(l.inicio)))::bigint AS total_segundos,
                       coalesce(floor(sum(extract(EPOCH FROM coalesce(l.fim, now()) - l.inicio))
                                FILTER (WHERE l.status = 'EM_ANDAMENTO')), 0)::bigint AS andamento_segundos
                  FROM limites l
                 GROUP BY l.chamado_id
            )
            """;

    private final EntityManager entityManager;

    public TemposRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public record TempoDoChamado(long totalSegundos, long emAndamentoSegundos) {
    }

    /** Médias dos chamados concluídos; {@code null} quando ainda não há nenhum. */
    public record ResumoDeTempos(long concluidos, Long resolucaoMediaSegundos, Long andamentoMedioSegundos) {
    }

    public record TempoPorResponsavel(Long usuarioId, String nome, long concluidos, long resolucaoMediaSegundos,
                                      long andamentoMedioSegundos) {
    }

    public record ChamadoEmAberto(Long id, String titulo, StatusChamado status, Urgencia urgencia, Instant criadoEm,
                                  long totalSegundos, long emAndamentoSegundos) {
    }

    public Optional<TempoDoChamado> doChamado(Long chamadoId) {
        List<?> linhas = consulta("c.id = :id", "SELECT total_segundos, andamento_segundos FROM tempos", null)
                .setParameter("id", chamadoId)
                .getResultList();
        return linhas.stream().map(Object[].class::cast)
                .map(l -> new TempoDoChamado(longo(l[0]), longo(l[1])))
                .findFirst();
    }

    public ResumoDeTempos resumoDosConcluidos(Long projetoId) {
        Object[] linha = (Object[]) consulta("c.status = 'CONCLUIDO'",
                "SELECT count(*), round(avg(total_segundos)), round(avg(andamento_segundos)) FROM tempos", projetoId)
                .getSingleResult();
        long concluidos = longo(linha[0]);
        return new ResumoDeTempos(concluidos, concluidos == 0 ? null : longo(linha[1]),
                concluidos == 0 ? null : longo(linha[2]));
    }

    /** Um chamado com vários responsáveis conta para cada um deles. */
    public List<TempoPorResponsavel> porResponsavel(Long projetoId) {
        List<?> linhas = consulta("c.status = 'CONCLUIDO'", """
                SELECT u.id, u.nome, count(*), round(avg(t.total_segundos)), round(avg(t.andamento_segundos))
                  FROM tempos t
                  JOIN chamado_responsavel r ON r.chamado_id = t.chamado_id
                  JOIN usuario u ON u.id = r.usuario_id
                 GROUP BY u.id, u.nome
                 ORDER BY u.nome, u.id
                """, projetoId).getResultList();
        return linhas.stream().map(Object[].class::cast)
                .map(l -> new TempoPorResponsavel(longo(l[0]), (String) l[1], longo(l[2]), longo(l[3]), longo(l[4])))
                .toList();
    }

    /** Chamados ainda não concluídos, dos mais antigos para os mais novos. */
    public List<ChamadoEmAberto> abertosHaMaisTempo(Long projetoId, int limite) {
        Query query = consulta("c.status <> 'CONCLUIDO'%s ORDER BY c.criado_em, c.id LIMIT :limite", """
                SELECT a.id, a.titulo, a.status, a.urgencia, a.criado_em, t.total_segundos, t.andamento_segundos
                  FROM alvo a
                  JOIN tempos t ON t.chamado_id = a.id
                 ORDER BY a.criado_em, a.id
                """, projetoId);
        List<?> linhas = query.setParameter("limite", limite).getResultList();
        return linhas.stream().map(Object[].class::cast)
                .map(l -> new ChamadoEmAberto(longo(l[0]), (String) l[1], StatusChamado.valueOf((String) l[2]),
                        Urgencia.valueOf((String) l[3]), instante(l[4]), longo(l[5]), longo(l[6])))
                .toList();
    }

    /**
     * Monta a consulta sobre a CTE de tempos. O filtro de projeto entra no lugar do {@code %s} da
     * condição, se houver um; senão, no fim dela.
     */
    private Query consulta(String condicao, String select, Long projetoId) {
        String doProjeto = projetoId == null ? "" : " AND c.projeto_id = :projetoId";
        String onde = condicao.contains("%s") ? condicao.formatted(doProjeto) : condicao + doProjeto;
        Query query = entityManager.createNativeQuery(TEMPOS.formatted(onde) + select);
        if (projetoId != null) {
            query.setParameter("projetoId", projetoId);
        }
        return query;
    }

    private static long longo(Object valor) {
        if (valor == null) {
            return 0;
        }
        return valor instanceof BigDecimal decimal ? decimal.longValue() : ((Number) valor).longValue();
    }

    private static Instant instante(Object valor) {
        return switch (valor) {
            case Instant instante -> instante;
            case OffsetDateTime data -> data.toInstant();
            case Timestamp timestamp -> timestamp.toInstant();
            default -> throw new IllegalStateException("Data inesperada: " + valor.getClass());
        };
    }
}
