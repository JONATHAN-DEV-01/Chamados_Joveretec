package br.com.joveretec.chamados.comum.erro;

import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.eclipse.microprofile.faulttolerance.exceptions.FaultToleranceException;
import org.jboss.logging.Logger;

/** Timeout, circuito aberto ou bulkhead cheio (SmallRye Fault Tolerance) viram 503. */
@Provider
public class IndisponivelMapper implements ExceptionMapper<FaultToleranceException> {

    private static final Logger LOG = Logger.getLogger(IndisponivelMapper.class);

    @Override
    public Response toResponse(FaultToleranceException excecao) {
        LOG.warnf("Operação interrompida pela tolerância a falhas: %s", excecao.getClass().getSimpleName());
        return RespostaErro.resposta(CodigoErro.INDISPONIVEL,
                "Serviço temporariamente indisponível. Tente novamente em instantes.");
    }
}
