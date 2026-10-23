package br.com.joveretec.chamados.comum.erro;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

import java.util.Comparator;
import java.util.List;
import java.util.stream.StreamSupport;

@Provider
public class ValidacaoMapper implements ExceptionMapper<ConstraintViolationException> {

    @Override
    public Response toResponse(ConstraintViolationException excecao) {
        List<RespostaErro.Detalhe> detalhes = excecao.getConstraintViolations().stream()
                .map(violacao -> new RespostaErro.Detalhe(campo(violacao), violacao.getMessage()))
                .sorted(Comparator.comparing(RespostaErro.Detalhe::campo))
                .toList();
        return RespostaErro.resposta(CodigoErro.VALIDACAO, "Dados inválidos.", detalhes);
    }

    /** Usa o último nó do caminho (ex.: {@code criar.requisicao.titulo} → {@code titulo}). */
    private static String campo(ConstraintViolation<?> violacao) {
        return StreamSupport.stream(violacao.getPropertyPath().spliterator(), false)
                .map(Path.Node::getName)
                .reduce((primeiro, segundo) -> segundo)
                .orElse("");
    }
}
