package br.com.joveretec.chamados.comum.paginacao;

import br.com.joveretec.chamados.comum.erro.ExcecaoDeNegocio;

import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Converte parâmetros de query em enums com mensagem de erro clara (o padrão JAX-RS responderia 404).
 * Aceita valores repetidos ({@code ?status=A&status=B}) e separados por vírgula ({@code ?status=A,B}).
 */
public final class ParametrosEnum {

    private ParametrosEnum() {
    }

    public static <E extends Enum<E>> Set<E> conjunto(Collection<String> valores, Class<E> tipo, String parametro) {
        Set<E> resultado = EnumSet.noneOf(tipo);
        if (valores == null) {
            return resultado;
        }
        valores.stream()
                .flatMap(valor -> Arrays.stream(valor.split(",")))
                .map(String::trim)
                .filter(valor -> !valor.isEmpty())
                .forEach(valor -> resultado.add(converter(valor, tipo, parametro)));
        return resultado;
    }

    public static <E extends Enum<E>> E valor(String valor, Class<E> tipo, String parametro) {
        return valor == null || valor.isBlank() ? null : converter(valor.trim(), tipo, parametro);
    }

    private static <E extends Enum<E>> E converter(String valor, Class<E> tipo, String parametro) {
        try {
            return Enum.valueOf(tipo, valor.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            String aceitos = Arrays.stream(tipo.getEnumConstants()).map(Enum::name).collect(Collectors.joining(", "));
            throw ExcecaoDeNegocio.validacao(
                    "Valor inválido para '" + parametro + "': " + valor + ". Valores aceitos: " + aceitos + ".");
        }
    }
}
