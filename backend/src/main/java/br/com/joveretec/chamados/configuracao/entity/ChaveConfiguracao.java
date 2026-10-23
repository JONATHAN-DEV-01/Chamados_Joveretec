package br.com.joveretec.chamados.configuracao.entity;

/** Chaves persistidas na tabela {@code configuracao}, com o valor padrão usado em fallback. */
public enum ChaveConfiguracao {
    PALETA_FUNDO("paleta.fundo", "#171717"),
    PALETA_SUPERFICIE("paleta.superficie", "#444444"),
    PALETA_DESTAQUE("paleta.destaque", "#DA0037"),
    PALETA_TEXTO("paleta.texto", "#EDEDED"),
    NOME_SISTEMA("geral.nome_sistema", "Chamados Joveretec"),
    TAMANHO_PAGINA_PADRAO("geral.tamanho_pagina_padrao", "20");

    private final String chave;
    private final String valorPadrao;

    ChaveConfiguracao(String chave, String valorPadrao) {
        this.chave = chave;
        this.valorPadrao = valorPadrao;
    }

    public String chave() {
        return chave;
    }

    public String valorPadrao() {
        return valorPadrao;
    }
}
