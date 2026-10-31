package br.com.joveretec.chamados.comum.paginacao;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.QueryParam;

import java.util.Objects;

/** Parâmetros de paginação recebidos via query string ({@code ?pagina=0&tamanho=20}). */
public class Paginacao {

    public static final int TAMANHO_PADRAO = 20;
    public static final int TAMANHO_MAXIMO = 100;

    @QueryParam("pagina")
    @DefaultValue("0")
    @Min(value = 0, message = "A página deve ser maior ou igual a 0.")
    int pagina;

    @QueryParam("tamanho")
    @DefaultValue("" + TAMANHO_PADRAO)
    @Min(value = 1, message = "O tamanho da página deve ser maior ou igual a 1.")
    @Max(value = TAMANHO_MAXIMO, message = "O tamanho da página deve ser no máximo " + TAMANHO_MAXIMO + ".")
    int tamanho;

    public Paginacao() {
        this(0, TAMANHO_PADRAO);
    }

    public Paginacao(int pagina, int tamanho) {
        this.pagina = pagina;
        this.tamanho = tamanho;
    }

    public int pagina() {
        return pagina;
    }

    public int tamanho() {
        return tamanho;
    }

    /** Igualdade por valor: a paginação faz parte da chave dos caches de listagem. */
    @Override
    public boolean equals(Object outro) {
        return outro instanceof Paginacao p && p.pagina == pagina && p.tamanho == tamanho;
    }

    @Override
    public int hashCode() {
        return Objects.hash(pagina, tamanho);
    }
}
