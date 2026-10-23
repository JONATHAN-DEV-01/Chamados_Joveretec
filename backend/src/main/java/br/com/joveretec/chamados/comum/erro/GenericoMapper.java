package br.com.joveretec.chamados.comum.erro;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import jakarta.persistence.OptimisticLockException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.hibernate.StaleStateException;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/** Mapeadores para erros de infraestrutura (HTTP, JSON, concorrência e falhas inesperadas). */
public final class GenericoMapper {

    private static final Logger LOG = Logger.getLogger(GenericoMapper.class);
    private static final String MENSAGEM_CONCORRENCIA =
            "O registro foi alterado por outra pessoa. Recarregue e tente novamente.";
    private static final String MENSAGEM_JSON_INVALIDO =
            "Corpo da requisição inválido: verifique o JSON e os valores enviados.";

    private GenericoMapper() {
    }

    @Provider
    public static class Http implements ExceptionMapper<WebApplicationException> {
        @Override
        public Response toResponse(WebApplicationException excecao) {
            if (excecao.getCause() instanceof JsonProcessingException) {
                return JsonInvalido.resposta();
            }
            int status = excecao.getResponse().getStatus();
            return RespostaErro.resposta(CodigoErro.doStatus(status), mensagemPara(status));
        }

        private static String mensagemPara(int status) {
            return switch (status) {
                case 404 -> "Recurso não encontrado.";
                case 405 -> "Método HTTP não permitido para este recurso.";
                case 415 -> "Tipo de conteúdo não suportado. Use application/json.";
                case 401 -> "Autenticação necessária ou token inválido.";
                case 403 -> "Você não tem permissão para esta operação.";
                default -> status >= 500 ? "Erro interno no servidor." : "Requisição inválida.";
            };
        }
    }

    @Provider
    public static class JsonInvalido implements ExceptionMapper<JsonProcessingException> {
        @Override
        public Response toResponse(JsonProcessingException excecao) {
            return resposta();
        }

        static Response resposta() {
            return RespostaErro.resposta(CodigoErro.VALIDACAO, MENSAGEM_JSON_INVALIDO);
        }
    }

    /** Valor com tipo errado em um campo (ex.: urgência inexistente); informa qual campo falhou. */
    @Provider
    public static class ValorInvalido implements ExceptionMapper<MismatchedInputException> {
        @Override
        public Response toResponse(MismatchedInputException excecao) {
            String campo = excecao.getPath().stream()
                    .map(JsonMappingException.Reference::getFieldName)
                    .filter(Objects::nonNull)
                    .collect(Collectors.joining("."));
            List<RespostaErro.Detalhe> detalhes = campo.isEmpty()
                    ? List.of()
                    : List.of(new RespostaErro.Detalhe(campo, "Valor inválido para este campo."));
            return RespostaErro.resposta(CodigoErro.VALIDACAO, MENSAGEM_JSON_INVALIDO, detalhes);
        }
    }

    @Provider
    public static class Concorrencia implements ExceptionMapper<OptimisticLockException> {
        @Override
        public Response toResponse(OptimisticLockException excecao) {
            return RespostaErro.resposta(CodigoErro.CONFLITO, MENSAGEM_CONCORRENCIA);
        }
    }

    @Provider
    public static class ConcorrenciaHibernate implements ExceptionMapper<StaleStateException> {
        @Override
        public Response toResponse(StaleStateException excecao) {
            return RespostaErro.resposta(CodigoErro.CONFLITO, MENSAGEM_CONCORRENCIA);
        }
    }

    @Provider
    public static class Inesperado implements ExceptionMapper<Exception> {
        @Override
        public Response toResponse(Exception excecao) {
            LOG.error("Erro inesperado ao processar a requisição", excecao);
            return RespostaErro.resposta(CodigoErro.ERRO_INTERNO, "Erro interno no servidor.");
        }
    }
}
