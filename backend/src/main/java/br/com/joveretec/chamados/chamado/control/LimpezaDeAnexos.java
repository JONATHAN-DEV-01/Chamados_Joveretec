package br.com.joveretec.chamados.chamado.control;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

/** Remove periodicamente anexos pendentes e rascunhos abandonados (ver {@link AnexoService#limparPendentes}). */
@ApplicationScoped
public class LimpezaDeAnexos {

    private static final Logger LOG = Logger.getLogger(LimpezaDeAnexos.class);

    private final AnexoService anexos;

    public LimpezaDeAnexos(AnexoService anexos) {
        this.anexos = anexos;
    }

    @Scheduled(every = "{armazenamento.limpeza.intervalo}", delayed = "1m",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void executar() {
        try {
            anexos.limparPendentes();
        } catch (RuntimeException e) {
            // Tenta de novo na próxima execução; não derruba o agendador.
            LOG.warn("Falha na limpeza de anexos pendentes; nova tentativa na próxima execução.", e);
        }
    }
}
