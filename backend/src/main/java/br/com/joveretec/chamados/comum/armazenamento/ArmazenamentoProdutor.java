package br.com.joveretec.chamados.comum.armazenamento;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.inject.Instance;
import jakarta.enterprise.inject.Produces;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/** Escolhe, em tempo de execução, a implementação de {@link ArmazenamentoArquivos}. */
@ApplicationScoped
public class ArmazenamentoProdutor {

    private static final Logger LOG = Logger.getLogger(ArmazenamentoProdutor.class);

    public enum Tipo {
        LOCAL,
        SUPABASE
    }

    private final Tipo tipo;
    private final Instance<SupabaseArmazenamento> supabase;
    private final Instance<LocalArmazenamento> local;

    public ArmazenamentoProdutor(@ConfigProperty(name = "armazenamento.tipo") String tipo,
                                 Instance<SupabaseArmazenamento> supabase, Instance<LocalArmazenamento> local) {
        this.tipo = Tipo.valueOf(tipo.trim().toUpperCase());
        this.supabase = supabase;
        this.local = local;
    }

    @Produces
    @ApplicationScoped
    ArmazenamentoArquivos ativo() {
        return tipo == Tipo.SUPABASE ? supabase.get() : local.get();
    }

    public boolean localAtivo() {
        return tipo == Tipo.LOCAL;
    }

    /** Falha na subida (com mensagem clara) se o Supabase estiver ativo sem configuração. */
    void validarNaSubida(@Observes StartupEvent evento) {
        if (tipo == Tipo.SUPABASE) {
            supabase.get().validarConfiguracao();
        }
        LOG.infof("Armazenamento de anexos: %s.", tipo);
    }
}
