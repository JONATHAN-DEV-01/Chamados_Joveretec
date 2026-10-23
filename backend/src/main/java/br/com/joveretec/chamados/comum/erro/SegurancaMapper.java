package br.com.joveretec.chamados.comum.erro;

import io.quarkus.security.AuthenticationFailedException;
import io.quarkus.security.ForbiddenException;
import io.quarkus.security.UnauthorizedException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import jakarta.ws.rs.ext.ExceptionMapper;

/** Padroniza as respostas 401/403 geradas pela camada de segurança do Quarkus. */
public final class SegurancaMapper {

    private static final String MENSAGEM_401 = "Autenticação necessária ou token inválido.";
    private static final String MENSAGEM_403 = "Você não tem permissão para esta operação.";

    private SegurancaMapper() {
    }

    @Provider
    public static class NaoAutorizado implements ExceptionMapper<UnauthorizedException> {
        @Override
        public Response toResponse(UnauthorizedException excecao) {
            return RespostaErro.resposta(CodigoErro.NAO_AUTENTICADO, MENSAGEM_401);
        }
    }

    @Provider
    public static class FalhaDeAutenticacao implements ExceptionMapper<AuthenticationFailedException> {
        @Override
        public Response toResponse(AuthenticationFailedException excecao) {
            return RespostaErro.resposta(CodigoErro.NAO_AUTENTICADO, MENSAGEM_401);
        }
    }

    @Provider
    public static class Proibido implements ExceptionMapper<ForbiddenException> {
        @Override
        public Response toResponse(ForbiddenException excecao) {
            return RespostaErro.resposta(CodigoErro.ACESSO_NEGADO, MENSAGEM_403);
        }
    }
}
