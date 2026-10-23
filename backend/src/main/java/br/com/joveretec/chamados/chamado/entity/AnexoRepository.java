package br.com.joveretec.chamados.chamado.entity;

import br.com.joveretec.chamados.chamado.entity.Anexo.Status;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class AnexoRepository implements PanacheRepository<Anexo> {

    /** Com chamado, projeto, quem enviou e (se houver) o acompanhamento já carregados. */
    public Optional<Anexo> buscarCompleto(Long id) {
        return find("from Anexo x join fetch x.chamado c join fetch c.projeto join fetch x.enviadoPor"
                + " left join fetch x.acompanhamento where x.id = ?1", id).firstResultOptional();
    }

    public List<Anexo> concluidosDaAbertura(Long chamadoId) {
        return find("from Anexo x join fetch x.enviadoPor where x.chamado.id = ?1 and x.acompanhamento is null"
                + " and x.status = ?2 order by x.criadoEm, x.id", chamadoId, Status.CONCLUIDO).list();
    }

    public List<Anexo> concluidosDosAcompanhamentos(Collection<Long> acompanhamentoIds) {
        if (acompanhamentoIds.isEmpty()) {
            return List.of();
        }
        return find("from Anexo x join fetch x.enviadoPor where x.acompanhamento.id in ?1 and x.status = ?2"
                + " order by x.criadoEm, x.id", acompanhamentoIds, Status.CONCLUIDO).list();
    }

    /** Todos os anexos do acompanhamento, de qualquer status (para exclusão e publicação). */
    public List<Anexo> doAcompanhamento(Long acompanhamentoId) {
        return list("acompanhamento.id", acompanhamentoId);
    }

    public List<Anexo> pendentesCriadosAntesDe(Instant limite) {
        return list("status = ?1 and criadoEm < ?2", Status.PENDENTE, limite);
    }
}
