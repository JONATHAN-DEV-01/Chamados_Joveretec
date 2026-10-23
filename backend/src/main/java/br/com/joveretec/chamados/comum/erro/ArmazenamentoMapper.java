package br.com.joveretec.chamados.comum.erro;

import br.com.joveretec.chamados.comum.armazenamento.FalhaNoArmazenamento;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

/** Falhas do armazenamento de arquivos (Supabase Storage) viram 503 com mensagem clara. */
@Provider
public class ArmazenamentoMapper implements ExceptionMapper<FalhaNoArmazenamento> {

    private static final Logger LOG = Logger.getLogger(ArmazenamentoMapper.class);

    @Override
    public Response toResponse(FalhaNoArmazenamento excecao) {
        LOG.warn(excecao.getMessage());
        return RespostaErro.resposta(CodigoErro.INDISPONIVEL,
                "O serviço de arquivos está indisponível no momento. Tente novamente em instantes.");
    }
}
