package br.com.joveretec.chamados.comum.paginacao;

import io.quarkus.panache.common.Parameters;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

/** Monta cláusulas WHERE dinâmicas (filtros opcionais) com parâmetros nomeados. */
public final class CondicoesConsulta {

    private final List<String> clausulas = new ArrayList<>();
    private final Parameters parametros = new Parameters();

    public CondicoesConsulta se(boolean aplicar, String clausula) {
        if (aplicar) {
            clausulas.add(clausula);
        }
        return this;
    }

    public CondicoesConsulta igual(String clausula, String parametro, Object valor) {
        if (valor != null) {
            clausulas.add(clausula);
            parametros.and(parametro, valor);
        }
        return this;
    }

    public CondicoesConsulta em(String clausula, String parametro, Collection<?> valores) {
        if (valores != null && !valores.isEmpty()) {
            clausulas.add(clausula);
            parametros.and(parametro, valores);
        }
        return this;
    }

    /** Adiciona um filtro de texto; o valor é passado como padrão {@code %texto%} em minúsculas. */
    public CondicoesConsulta contem(String clausula, String parametro, String texto) {
        if (texto != null && !texto.isBlank()) {
            clausulas.add(clausula);
            parametros.and(parametro, "%" + texto.trim().toLowerCase(Locale.ROOT) + "%");
        }
        return this;
    }

    public String where() {
        return clausulas.isEmpty() ? "1 = 1" : String.join(" and ", clausulas);
    }

    public Parameters parametros() {
        return parametros;
    }
}
