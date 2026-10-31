package br.com.joveretec.chamados.usuario.entity;

import java.util.Locale;

/** Cores {@code #RRGGBB} (maiúsculas) que o usuário escolheu para a própria sessão. */
public record PaletaPessoal(String fundo, String superficie, String destaque, String texto) {

    public PaletaPessoal {
        fundo = normalizar(fundo);
        superficie = normalizar(superficie);
        destaque = normalizar(destaque);
        texto = normalizar(texto);
    }

    private static String normalizar(String hex) {
        return hex.toUpperCase(Locale.ROOT);
    }
}
