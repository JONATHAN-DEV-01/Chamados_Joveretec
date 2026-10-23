package br.com.joveretec.chamados.configuracao.control;

import br.com.joveretec.chamados.configuracao.entity.ChaveConfiguracao;
import br.com.joveretec.chamados.configuracao.entity.Configuracao;
import br.com.joveretec.chamados.configuracao.entity.ConfiguracaoRepository;
import io.quarkus.cache.Cache;
import io.quarkus.cache.CacheName;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.faulttolerance.CircuitBreaker;
import org.eclipse.microprofile.faulttolerance.Fallback;
import org.eclipse.microprofile.faulttolerance.Timeout;
import org.jboss.logging.Logger;

import java.time.temporal.ChronoUnit;
import java.util.Map;

@ApplicationScoped
public class ConfiguracaoService {

    private static final Logger LOG = Logger.getLogger(ConfiguracaoService.class);

    private final LeitorDeConfiguracoes leitor;
    private final ConfiguracaoRepository repositorio;
    private final Cache cache;

    public ConfiguracaoService(LeitorDeConfiguracoes leitor, ConfiguracaoRepository repositorio,
                               @CacheName(LeitorDeConfiguracoes.CACHE) Cache cache) {
        this.leitor = leitor;
        this.repositorio = repositorio;
        this.cache = cache;
    }

    /**
     * Endpoint público consultado em toda carga do frontend: se o banco estiver lento ou fora,
     * responde com a paleta padrão em vez de falhar.
     */
    @Timeout(value = 2, unit = ChronoUnit.SECONDS)
    @CircuitBreaker(requestVolumeThreshold = 4, failureRatio = 0.5, delay = 10, delayUnit = ChronoUnit.SECONDS)
    @Fallback(fallbackMethod = "configuracoesPadrao")
    public Configuracoes obter() {
        return leitor.carregar();
    }

    Configuracoes configuracoesPadrao() {
        LOG.warn("Não foi possível ler as configurações do banco; usando os valores padrão.");
        return Configuracoes.padrao();
    }

    /** Grava e só depois do commit invalida o cache, para nenhuma leitura concorrente recachear o valor antigo. */
    public Configuracoes atualizar(Configuracoes novas, Long autorId) {
        QuarkusTransaction.requiringNew().run(() -> gravar(novas, autorId));
        cache.invalidateAll().await().indefinitely();
        LOG.infof("Configurações atualizadas pelo usuário id=%d.", autorId);
        return leitor.carregar();
    }

    private void gravar(Configuracoes novas, Long autorId) {
        for (Map.Entry<ChaveConfiguracao, String> entrada : novas.paraValores().entrySet()) {
            String chave = entrada.getKey().chave();
            repositorio.findByIdOptional(chave).ifPresentOrElse(
                    existente -> existente.alterarValor(entrada.getValue(), autorId),
                    () -> {
                        Configuracao nova = new Configuracao(chave, entrada.getValue());
                        nova.alterarValor(entrada.getValue(), autorId);
                        repositorio.persist(nova);
                    });
        }
    }
}
