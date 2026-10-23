package br.com.joveretec.chamados.comum.armazenamento;

import br.com.joveretec.chamados.comum.armazenamento.AutorizacaoEnvio.Protocolo;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Typed;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.faulttolerance.CircuitBreaker;
import org.eclipse.microprofile.faulttolerance.Retry;
import org.eclipse.microprofile.faulttolerance.Timeout;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Supabase Storage via API REST, autenticado com a service role key (que nunca sai do backend).
 * O navegador envia o arquivo direto ao Supabase pelo protocolo TUS, com um token de upload
 * assinado gerado aqui para um caminho definido pelo backend.
 */
@ApplicationScoped
@Typed(SupabaseArmazenamento.class)
public class SupabaseArmazenamento implements ArmazenamentoArquivos {

    private static final Logger LOG = Logger.getLogger(SupabaseArmazenamento.class);
    /** O Supabase exige partes de exatamente 6 MB no upload resumível. */
    static final long PARTE_TUS = 6L * 1024 * 1024;
    private static final Duration TIMEOUT_HTTP = Duration.ofSeconds(8);

    private final Optional<String> url;
    private final Optional<String> chaveServico;
    private final Optional<String> chavePublica;
    private final String bucket;
    private final String caminhoTus;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(TIMEOUT_HTTP).build();

    public SupabaseArmazenamento(@ConfigProperty(name = "supabase.url") Optional<String> url,
                                 @ConfigProperty(name = "supabase.service-role-key") Optional<String> chaveServico,
                                 @ConfigProperty(name = "supabase.anon-key") Optional<String> chavePublica,
                                 @ConfigProperty(name = "armazenamento.bucket") String bucket,
                                 @ConfigProperty(name = "supabase.storage.tus-path") String caminhoTus,
                                 ObjectMapper json) {
        this.url = url.map(u -> u.replaceAll("/+$", ""));
        this.chaveServico = chaveServico;
        this.chavePublica = chavePublica;
        this.bucket = bucket;
        this.caminhoTus = caminhoTus;
        this.json = json;
    }

    void validarConfiguracao() {
        if (url.isEmpty() || chaveServico.isEmpty()) {
            throw new IllegalStateException("Armazenamento Supabase ativo, mas SUPABASE_URL e/ou "
                    + "SUPABASE_SERVICE_ROLE_KEY não foram definidas.");
        }
        if (chavePublica.isEmpty()) {
            LOG.warn("SUPABASE_ANON_KEY não definida: o upload TUS pode ser recusado pelo gateway do Supabase.");
        }
    }

    @Override
    @Timeout(value = 10, unit = ChronoUnit.SECONDS)
    @Retry(maxRetries = 2, delay = 300, retryOn = FalhaNoArmazenamento.class, abortOn = FalhaNoArmazenamento.Recusa.class)
    @CircuitBreaker(requestVolumeThreshold = 6, failureRatio = 0.5, delay = 30, delayUnit = ChronoUnit.SECONDS,
            skipOn = FalhaNoArmazenamento.Recusa.class)
    public AutorizacaoEnvio autorizarEnvio(String caminho, String tipoMime) {
        JsonNode resposta = enviar(requisicao("/storage/v1/object/upload/sign/" + bucket + "/" + caminho)
                .POST(BodyPublishers.ofString("{}")), "autorizar envio");
        String token = parametro(resposta.path("url").asText(), "token");

        Map<String, String> cabecalhos = new LinkedHashMap<>();
        cabecalhos.put("x-signature", token);
        cabecalhos.put("x-upsert", "false");
        chavePublica.ifPresent(chave -> cabecalhos.put("apikey", chave));
        Map<String, String> metadados = Map.of(
                "bucketName", bucket, "objectName", caminho, "contentType", tipoMime, "cacheControl", "3600");
        return new AutorizacaoEnvio(Protocolo.TUS, url.orElseThrow() + caminhoTus, cabecalhos, metadados, PARTE_TUS);
    }

    @Override
    @Timeout(value = 10, unit = ChronoUnit.SECONDS)
    @Retry(maxRetries = 2, delay = 300, retryOn = FalhaNoArmazenamento.class, abortOn = FalhaNoArmazenamento.Recusa.class)
    @CircuitBreaker(requestVolumeThreshold = 6, failureRatio = 0.5, delay = 30, delayUnit = ChronoUnit.SECONDS,
            skipOn = FalhaNoArmazenamento.Recusa.class)
    public Optional<Long> tamanho(String caminho) {
        HttpResponse<Void> resposta = executar(requisicao("/storage/v1/object/" + bucket + "/" + caminho)
                .method("HEAD", BodyPublishers.noBody()), BodyHandlers.discarding(), "consultar objeto");
        int status = resposta.statusCode();
        // O Storage responde 400 ou 404 para objeto inexistente.
        if (status == 400 || status == 404) {
            return Optional.empty();
        }
        exigirSucesso(status, "consultar objeto");
        return resposta.headers().firstValueAsLong("content-length").stream().boxed().findFirst()
                .or(() -> Optional.of(0L));
    }

    @Override
    @Timeout(value = 10, unit = ChronoUnit.SECONDS)
    @Retry(maxRetries = 2, delay = 300, retryOn = FalhaNoArmazenamento.class, abortOn = FalhaNoArmazenamento.Recusa.class)
    @CircuitBreaker(requestVolumeThreshold = 6, failureRatio = 0.5, delay = 30, delayUnit = ChronoUnit.SECONDS,
            skipOn = FalhaNoArmazenamento.Recusa.class)
    public String urlDeDownload(String caminho, String nomeArquivo, boolean inline, Duration validade) {
        String corpo = "{\"expiresIn\":" + validade.toSeconds() + "}";
        JsonNode resposta = enviar(requisicao("/storage/v1/object/sign/" + bucket + "/" + caminho)
                .POST(BodyPublishers.ofString(corpo)), "gerar link de download");
        String assinada = url.orElseThrow() + "/storage/v1" + resposta.path("signedURL").asText();
        return inline ? assinada : assinada + "&download=" + URLEncoder.encode(nomeArquivo, StandardCharsets.UTF_8);
    }

    @Override
    @Timeout(value = 15, unit = ChronoUnit.SECONDS)
    @Retry(maxRetries = 2, delay = 300, retryOn = FalhaNoArmazenamento.class, abortOn = FalhaNoArmazenamento.Recusa.class)
    @CircuitBreaker(requestVolumeThreshold = 6, failureRatio = 0.5, delay = 30, delayUnit = ChronoUnit.SECONDS,
            skipOn = FalhaNoArmazenamento.Recusa.class)
    public void excluir(Collection<String> caminhos) {
        if (caminhos.isEmpty()) {
            return;
        }
        String corpo;
        try {
            corpo = json.writeValueAsString(Map.of("prefixes", caminhos));
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
        enviar(requisicao("/storage/v1/object/" + bucket).method("DELETE", BodyPublishers.ofString(corpo)),
                "excluir objetos");
    }

    private HttpRequest.Builder requisicao(String caminhoApi) {
        String chave = chaveServico.orElseThrow(() -> new FalhaNoArmazenamento.Recusa("Storage não configurado."));
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url.orElseThrow() + caminhoApi))
                .timeout(TIMEOUT_HTTP)
                .header("apikey", chave)
                .header("Content-Type", "application/json");
        // Chaves novas (sb_secret_...) não são JWT: vão só no header apikey.
        return chave.startsWith("sb_") ? builder : builder.header("Authorization", "Bearer " + chave);
    }

    private JsonNode enviar(HttpRequest.Builder builder, String operacao) {
        HttpResponse<String> resposta = executar(builder, BodyHandlers.ofString(), operacao);
        exigirSucesso(resposta.statusCode(), operacao);
        try {
            return json.readTree(resposta.body());
        } catch (IOException e) {
            throw new FalhaNoArmazenamento("Resposta inválida do Storage ao " + operacao + ".", e);
        }
    }

    private <T> HttpResponse<T> executar(HttpRequest.Builder builder, HttpResponse.BodyHandler<T> corpo,
                                         String operacao) {
        try {
            return http.send(builder.build(), corpo);
        } catch (IOException e) {
            throw new FalhaNoArmazenamento("Falha de comunicação com o Storage ao " + operacao + ".", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new FalhaNoArmazenamento("Operação no Storage interrompida.", e);
        }
    }

    private static void exigirSucesso(int status, String operacao) {
        if (status >= 500) {
            throw new FalhaNoArmazenamento("Storage indisponível ao " + operacao + " (HTTP " + status + ").");
        }
        if (status >= 400) {
            LOG.warnf("Storage recusou %s: HTTP %d.", operacao, status);
            throw new FalhaNoArmazenamento.Recusa("O Storage recusou a operação (" + operacao + ", HTTP " + status
                    + "). Verifique o bucket e as chaves.");
        }
    }

    private static String parametro(String urlRelativa, String nome) {
        String consulta = URI.create("http://x" + urlRelativa).getRawQuery();
        if (consulta != null) {
            for (String par : consulta.split("&")) {
                String[] chaveValor = par.split("=", 2);
                if (chaveValor[0].equals(nome) && chaveValor.length == 2) {
                    return chaveValor[1];
                }
            }
        }
        throw new FalhaNoArmazenamento("Resposta do Storage sem o token de upload.");
    }
}
