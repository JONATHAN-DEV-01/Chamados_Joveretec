package br.com.joveretec.chamados.comum.paginacao;

import io.quarkus.hibernate.orm.panache.PanacheQuery;

import java.util.List;
import java.util.function.Function;

public record Pagina<T>(List<T> itens, int pagina, int tamanho, long totalItens, int totalPaginas) {

    public static <T> Pagina<T> de(PanacheQuery<T> consulta, Paginacao paginacao) {
        List<T> itens = consulta.page(paginacao.pagina(), paginacao.tamanho()).list();
        return de(itens, consulta.count(), paginacao);
    }

    public static <T> Pagina<T> de(List<T> itens, long totalItens, Paginacao paginacao) {
        return new Pagina<>(itens, paginacao.pagina(), paginacao.tamanho(), totalItens,
                totalPaginas(totalItens, paginacao.tamanho()));
    }

    public <R> Pagina<R> map(Function<T, R> conversor) {
        return new Pagina<>(itens.stream().map(conversor).toList(), pagina, tamanho, totalItens, totalPaginas);
    }

    private static int totalPaginas(long total, int tamanho) {
        return (int) ((total + tamanho - 1) / tamanho);
    }
}
