package br.com.joveretec.chamados.chamado.entity;

import br.com.joveretec.chamados.chamado.entity.Acompanhamento.Situacao;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Parameters;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class AcompanhamentoRepository implements PanacheRepository<Acompanhamento> {

    /** Com autor, chamado e projeto carregados (validações de permissão e de projeto arquivado). */
    public Optional<Acompanhamento> buscarCompleto(Long id) {
        return find("from Acompanhamento a join fetch a.autor join fetch a.chamado c join fetch c.projeto"
                + " where a.id = ?1", id).firstResultOptional();
    }

    public List<Acompanhamento> listarComAutor(Collection<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return find("from Acompanhamento a join fetch a.autor where a.id in ?1", ids).list();
    }

    public long tempoGastoTotalMinutos(Long chamadoId) {
        Long total = getEntityManager()
                .createQuery("select coalesce(sum(a.tempoGastoMinutos), 0) from Acompanhamento a"
                        + " where a.chamado.id = :chamadoId and a.situacao = :publicado", Long.class)
                .setParameter("chamadoId", chamadoId)
                .setParameter("publicado", Situacao.PUBLICADO)
                .getSingleResult();
        return total == null ? 0 : total;
    }

    /** Acompanhamentos mais recentes dos chamados em que o usuário é responsável ou autor. */
    public List<Acompanhamento> ultimosDosChamadosDoUsuario(Long usuarioId, int limite) {
        return find("from Acompanhamento a join fetch a.autor join fetch a.chamado c"
                        + " where a.situacao = :publicado"
                        + " and (c.responsavel.id = :usuarioId or c.criadoPor.id = :usuarioId)"
                        + " order by a.criadoEm desc, a.id desc",
                Parameters.with("publicado", Situacao.PUBLICADO).and("usuarioId", usuarioId))
                .page(0, limite)
                .list();
    }

    public List<Acompanhamento> rascunhosCriadosAntesDe(Instant limite) {
        return list("situacao = ?1 and criadoEm < ?2", Situacao.RASCUNHO, limite);
    }
}
