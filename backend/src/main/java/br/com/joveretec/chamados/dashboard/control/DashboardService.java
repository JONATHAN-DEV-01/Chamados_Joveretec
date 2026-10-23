package br.com.joveretec.chamados.dashboard.control;

import br.com.joveretec.chamados.chamado.entity.ChamadoRepository;
import br.com.joveretec.chamados.chamado.entity.ContagemPorResponsavel;
import br.com.joveretec.chamados.chamado.entity.ContagemPorStatus;
import br.com.joveretec.chamados.chamado.entity.ContagemPorUrgencia;
import br.com.joveretec.chamados.chamado.entity.FiltroChamados;
import br.com.joveretec.chamados.chamado.entity.StatusChamado;
import br.com.joveretec.chamados.chamado.entity.Urgencia;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.faulttolerance.Timeout;

import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Indicadores do dashboard; todas as contagens são agregadas no banco (GROUP BY). */
@ApplicationScoped
public class DashboardService {

    private static final long TIMEOUT_SEGUNDOS = 5;

    private final ChamadoRepository chamados;

    public DashboardService(ChamadoRepository chamados) {
        this.chamados = chamados;
    }

    @Timeout(value = TIMEOUT_SEGUNDOS, unit = ChronoUnit.SECONDS)
    public Map<StatusChamado, Long> porStatus(Long projetoId) {
        return contarPorStatus(FiltroChamados.doProjetoEResponsavel(projetoId, null));
    }

    @Timeout(value = TIMEOUT_SEGUNDOS, unit = ChronoUnit.SECONDS)
    public Map<Urgencia, Long> porUrgencia(Long projetoId) {
        return contarPorUrgencia(FiltroChamados.doProjetoEResponsavel(projetoId, null));
    }

    @Timeout(value = TIMEOUT_SEGUNDOS, unit = ChronoUnit.SECONDS)
    public List<TotaisDoDesenvolvedor> porDesenvolvedor(Long projetoId) {
        Map<Long, TotaisDoDesenvolvedor> porUsuario = new LinkedHashMap<>();
        for (ContagemPorResponsavel linha : chamados.contarPorResponsavel(
                FiltroChamados.doProjetoEResponsavel(projetoId, null))) {
            porUsuario.computeIfAbsent(linha.responsavelId(),
                            id -> new TotaisDoDesenvolvedor(id, linha.responsavelNome(), zerado(StatusChamado.class)))
                    .porStatus().put(linha.status(), linha.total());
        }
        return List.copyOf(porUsuario.values());
    }

    @Timeout(value = TIMEOUT_SEGUNDOS, unit = ChronoUnit.SECONDS)
    public MeusChamados meusChamados(Long usuarioId, Long projetoId) {
        FiltroChamados filtro = FiltroChamados.doProjetoEResponsavel(projetoId, usuarioId);
        Map<StatusChamado, Long> porStatus = contarPorStatus(filtro);
        long total = porStatus.values().stream().mapToLong(Long::longValue).sum();
        return new MeusChamados(total, porStatus, contarPorUrgencia(filtro));
    }

    private Map<StatusChamado, Long> contarPorStatus(FiltroChamados filtro) {
        Map<StatusChamado, Long> totais = zerado(StatusChamado.class);
        chamados.contarPorStatus(filtro).forEach((ContagemPorStatus c) -> totais.put(c.status(), c.total()));
        return totais;
    }

    private Map<Urgencia, Long> contarPorUrgencia(FiltroChamados filtro) {
        Map<Urgencia, Long> totais = zerado(Urgencia.class);
        chamados.contarPorUrgencia(filtro).forEach((ContagemPorUrgencia c) -> totais.put(c.urgencia(), c.total()));
        return totais;
    }

    /** Mapa com todas as constantes do enum valendo zero, para o dashboard sempre exibir todas as categorias. */
    private static <E extends Enum<E>> Map<E, Long> zerado(Class<E> tipo) {
        Map<E, Long> mapa = new EnumMap<>(tipo);
        for (E constante : tipo.getEnumConstants()) {
            mapa.put(constante, 0L);
        }
        return mapa;
    }

    public record TotaisDoDesenvolvedor(Long usuarioId, String nome, Map<StatusChamado, Long> porStatus) {

        public long total() {
            return porStatus.values().stream().mapToLong(Long::longValue).sum();
        }
    }

    public record MeusChamados(long total, Map<StatusChamado, Long> porStatus, Map<Urgencia, Long> porUrgencia) {
    }
}
