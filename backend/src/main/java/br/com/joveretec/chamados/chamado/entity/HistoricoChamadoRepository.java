package br.com.joveretec.chamados.chamado.entity;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.List;

@ApplicationScoped
public class HistoricoChamadoRepository implements PanacheRepository<HistoricoChamado> {

    /** Histórico do chamado, mais recente primeiro, com o autor da alteração já carregado. */
    public PanacheQuery<HistoricoChamado> listarDoChamado(Long chamadoId) {
        return find("from HistoricoChamado h join fetch h.usuario where h.chamado.id = ?1"
                + " order by h.alteradoEm desc, h.id desc", chamadoId);
    }

    public List<HistoricoChamado> listarComUsuario(Collection<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return find("from HistoricoChamado h join fetch h.usuario where h.id in ?1", ids).list();
    }

    public long contarDoChamado(Long chamadoId) {
        return count("chamado.id", chamadoId);
    }
}
