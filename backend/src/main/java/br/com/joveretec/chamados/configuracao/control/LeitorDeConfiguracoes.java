package br.com.joveretec.chamados.configuracao.control;

import br.com.joveretec.chamados.configuracao.entity.ChaveConfiguracao;
import br.com.joveretec.chamados.configuracao.entity.Configuracao;
import br.com.joveretec.chamados.configuracao.entity.ConfiguracaoRepository;
import io.quarkus.cache.CacheResult;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Arrays;
import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;

/**
 * Lê as configurações do banco com cache. Fica separado do {@link ConfiguracaoService} para que
 * o fallback de tolerância a falhas (aplicado lá) nunca seja armazenado no cache.
 */
@ApplicationScoped
public class LeitorDeConfiguracoes {

    static final String CACHE = "configuracoes";

    private final ConfiguracaoRepository repositorio;

    public LeitorDeConfiguracoes(ConfiguracaoRepository repositorio) {
        this.repositorio = repositorio;
    }

    @CacheResult(cacheName = CACHE)
    public Configuracoes carregar() {
        Map<ChaveConfiguracao, String> valores = new EnumMap<>(ChaveConfiguracao.class);
        for (Configuracao configuracao : repositorio.listAll()) {
            chaveDe(configuracao.getChave()).ifPresent(chave -> valores.put(chave, configuracao.getValor()));
        }
        return Configuracoes.deValores(valores);
    }

    private static Optional<ChaveConfiguracao> chaveDe(String chave) {
        return Arrays.stream(ChaveConfiguracao.values()).filter(c -> c.chave().equals(chave)).findFirst();
    }
}
