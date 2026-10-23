package br.com.joveretec.chamados.comum.erro;

import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

@Provider
public class ExcecaoDeNegocioMapper implements ExceptionMapper<ExcecaoDeNegocio> {

    @Override
    public Response toResponse(ExcecaoDeNegocio excecao) {
        return RespostaErro.resposta(excecao.codigo(), excecao.getMessage());
    }
}
