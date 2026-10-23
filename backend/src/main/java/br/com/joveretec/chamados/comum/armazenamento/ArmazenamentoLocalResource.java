package br.com.joveretec.chamados.comum.armazenamento;

import br.com.joveretec.chamados.comum.armazenamento.LocalArmazenamento.Acao;
import br.com.joveretec.chamados.comum.armazenamento.LocalArmazenamento.Autorizacao;
import br.com.joveretec.chamados.comum.erro.ExcecaoDeNegocio;
import jakarta.annotation.security.PermitAll;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/**
 * Envio e download do {@link LocalArmazenamento} (dev/test). Autorizado pelo token assinado na
 * URL, como as URLs assinadas do Supabase; responde 404 quando o armazenamento ativo não é o local.
 */
@Path("/api/armazenamento-local")
@PermitAll
public class ArmazenamentoLocalResource {

    private final ArmazenamentoProdutor produtor;
    private final LocalArmazenamento local;

    public ArmazenamentoLocalResource(ArmazenamentoProdutor produtor, LocalArmazenamento local) {
        this.produtor = produtor;
        this.local = local;
    }

    @PUT
    @Path("/{token}")
    @Consumes(MediaType.WILDCARD)
    public Response enviar(@PathParam("token") String token, InputStream conteudo) {
        Autorizacao autorizacao = autorizar(token, Acao.ENVIO);
        local.gravar(autorizacao.caminho(), conteudo);
        return Response.noContent().build();
    }

    /** Só imagens são exibidas inline; o resto sempre baixa como anexo. */
    @GET
    @Path("/{token}")
    public Response baixar(@PathParam("token") String token, @QueryParam("nome") String nome,
                           @QueryParam("inline") @DefaultValue("false") boolean inline) throws IOException {
        Autorizacao autorizacao = autorizar(token, Acao.DOWNLOAD);
        var arquivo = local.arquivo(autorizacao.caminho());
        if (!Files.isRegularFile(arquivo)) {
            throw ExcecaoDeNegocio.naoEncontrado("Arquivo não encontrado.");
        }
        String tipo = Files.probeContentType(arquivo);
        boolean exibir = inline && tipo != null && tipo.startsWith("image/");
        String nomeArquivo = URLEncoder.encode(nome == null ? "arquivo" : nome, StandardCharsets.UTF_8)
                .replace("+", "%20");
        return Response.ok(arquivo.toFile(), exibir ? tipo : MediaType.APPLICATION_OCTET_STREAM)
                .header("Content-Disposition", (exibir ? "inline" : "attachment") + "; filename*=UTF-8''" + nomeArquivo)
                .header("X-Content-Type-Options", "nosniff")
                .build();
    }

    private Autorizacao autorizar(String token, Acao acao) {
        if (!produtor.localAtivo()) {
            throw ExcecaoDeNegocio.naoEncontrado("Recurso não encontrado.");
        }
        return local.validar(token, acao)
                .orElseThrow(() -> ExcecaoDeNegocio.acessoNegado("Link de arquivo inválido ou expirado."));
    }
}
