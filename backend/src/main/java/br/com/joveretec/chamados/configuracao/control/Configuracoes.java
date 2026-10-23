package br.com.joveretec.chamados.configuracao.control;

import br.com.joveretec.chamados.configuracao.entity.ChaveConfiguracao;

import java.util.EnumMap;
import java.util.Map;

import static br.com.joveretec.chamados.configuracao.entity.ChaveConfiguracao.NOME_SISTEMA;
import static br.com.joveretec.chamados.configuracao.entity.ChaveConfiguracao.PALETA_DESTAQUE;
import static br.com.joveretec.chamados.configuracao.entity.ChaveConfiguracao.PALETA_FUNDO;
import static br.com.joveretec.chamados.configuracao.entity.ChaveConfiguracao.PALETA_SUPERFICIE;
import static br.com.joveretec.chamados.configuracao.entity.ChaveConfiguracao.PALETA_TEXTO;
import static br.com.joveretec.chamados.configuracao.entity.ChaveConfiguracao.TAMANHO_PAGINA_PADRAO;

/** Configurações do sistema em formato estruturado (imutável). */
public record Configuracoes(Paleta paleta, Geral geral) {

    public record Paleta(String fundo, String superficie, String destaque, String texto) {
    }

    public record Geral(String nomeSistema, int tamanhoPaginaPadrao) {
    }

    public static Configuracoes padrao() {
        return deValores(Map.of());
    }

    /** Monta a partir dos valores gravados; chaves ausentes assumem o valor padrão. */
    public static Configuracoes deValores(Map<ChaveConfiguracao, String> valores) {
        Map<ChaveConfiguracao, String> v = new EnumMap<>(ChaveConfiguracao.class);
        for (ChaveConfiguracao chave : ChaveConfiguracao.values()) {
            v.put(chave, valores.getOrDefault(chave, chave.valorPadrao()));
        }
        return new Configuracoes(
                new Paleta(v.get(PALETA_FUNDO), v.get(PALETA_SUPERFICIE), v.get(PALETA_DESTAQUE), v.get(PALETA_TEXTO)),
                new Geral(v.get(NOME_SISTEMA), Integer.parseInt(v.get(TAMANHO_PAGINA_PADRAO))));
    }

    public Map<ChaveConfiguracao, String> paraValores() {
        Map<ChaveConfiguracao, String> valores = new EnumMap<>(ChaveConfiguracao.class);
        valores.put(PALETA_FUNDO, paleta.fundo());
        valores.put(PALETA_SUPERFICIE, paleta.superficie());
        valores.put(PALETA_DESTAQUE, paleta.destaque());
        valores.put(PALETA_TEXTO, paleta.texto());
        valores.put(NOME_SISTEMA, geral.nomeSistema());
        valores.put(TAMANHO_PAGINA_PADRAO, String.valueOf(geral.tamanhoPaginaPadrao()));
        return valores;
    }
}
