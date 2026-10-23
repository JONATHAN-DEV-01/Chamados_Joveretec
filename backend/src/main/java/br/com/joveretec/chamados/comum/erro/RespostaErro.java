package br.com.joveretec.chamados.comum.erro;

import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.Instant;
import java.util.List;

/** Corpo padrão de todas as respostas de erro da API. */
public record RespostaErro(String codigo, String mensagem, List<Detalhe> detalhes, Instant timestamp) {

    public record Detalhe(String campo, String mensagem) {
    }

    public static Response resposta(CodigoErro codigo, String mensagem) {
        return resposta(codigo, mensagem, List.of());
    }

    public static Response resposta(CodigoErro codigo, String mensagem, List<Detalhe> detalhes) {
        return Response.status(codigo.status())
                .type(MediaType.APPLICATION_JSON_TYPE)
                .entity(new RespostaErro(codigo.name(), mensagem, detalhes, Instant.now()))
                .build();
    }
}
