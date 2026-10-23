package br.com.joveretec.chamados.comum.armazenamento;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Contrato com a API REST do Supabase Storage, contra um servidor HTTP falso (sem CDI). */
class SupabaseArmazenamentoTest {

    private HttpServer servidor;
    private SupabaseArmazenamento storage;
    private final Map<String, Requisicao> recebidas = new ConcurrentHashMap<>();
    private volatile int statusForcado;

    record Requisicao(String metodo, String caminho, String apikey, String authorization, String corpo) {
    }

    @BeforeEach
    void iniciar() throws IOException {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/", this::responder);
        servidor.start();
        String url = "http://127.0.0.1:" + servidor.getAddress().getPort() + "/";
        storage = new SupabaseArmazenamento(Optional.of(url), Optional.of("chave-servico"), Optional.of("chave-publica"),
                "chamados-anexos", "/storage/v1/upload/resumable/sign", new ObjectMapper());
    }

    @AfterEach
    void parar() {
        servidor.stop(0);
    }

    @Test
    void autorizaEnvioTusComTokenAssinadoEChavePublica() {
        AutorizacaoEnvio envio = storage.autorizarEnvio("projetos/1/chamados/2/abertura/3-a.pdf", "application/pdf");

        Requisicao req = recebidas.get("POST /storage/v1/object/upload/sign/chamados-anexos/projetos/1/chamados/2/abertura/3-a.pdf");
        assertEquals("chave-servico", req.apikey());
        assertEquals("Bearer chave-servico", req.authorization());

        assertEquals(AutorizacaoEnvio.Protocolo.TUS, envio.protocolo());
        assertTrue(envio.url().endsWith("/storage/v1/upload/resumable/sign"));
        assertEquals("tok-123", envio.cabecalhos().get("x-signature"));
        assertEquals("chave-publica", envio.cabecalhos().get("apikey"));
        assertEquals("chamados-anexos", envio.metadados().get("bucketName"));
        assertEquals("projetos/1/chamados/2/abertura/3-a.pdf", envio.metadados().get("objectName"));
        assertEquals("application/pdf", envio.metadados().get("contentType"));
        assertEquals(6L * 1024 * 1024, envio.tamanhoParte());
    }

    @Test
    void consultaTamanhoComHeadEEntendeObjetoInexistente() {
        assertEquals(Optional.of(42L), storage.tamanho("existe.txt"));
        assertEquals(Optional.empty(), storage.tamanho("nao-existe.txt"));
        assertEquals("HEAD", recebidas.get("HEAD /storage/v1/object/chamados-anexos/existe.txt").metodo());
    }

    @Test
    void geraLinkAssinadoDeDownloadComNomeDoArquivo() {
        String url = storage.urlDeDownload("p/a.pdf", "Relatório final.pdf", false, Duration.ofMinutes(5));
        assertTrue(url.contains("/storage/v1/object/sign/chamados-anexos/p/a.pdf?token=dl-456"), url);
        assertTrue(url.endsWith("&download=Relat%C3%B3rio+final.pdf"), url);
        assertEquals("{\"expiresIn\":300}", recebidas.get("POST /storage/v1/object/sign/chamados-anexos/p/a.pdf").corpo());

        String inline = storage.urlDeDownload("p/a.pdf", "x.pdf", true, Duration.ofMinutes(5));
        assertTrue(inline.endsWith("token=dl-456"), inline);
    }

    @Test
    void excluiVariosObjetosDeUmaVez() {
        storage.excluir(List.of("p/a.txt", "p/b.txt"));
        Requisicao req = recebidas.get("DELETE /storage/v1/object/chamados-anexos");
        assertEquals("{\"prefixes\":[\"p/a.txt\",\"p/b.txt\"]}", req.corpo());
    }

    @Test
    void erro5xxEhFalhaTransitoriaE4xxEhRecusa() {
        statusForcado = 503;
        FalhaNoArmazenamento transitoria = assertThrows(FalhaNoArmazenamento.class, () -> storage.excluir(List.of("x")));
        assertTrue(!(transitoria instanceof FalhaNoArmazenamento.Recusa));

        statusForcado = 403;
        assertThrows(FalhaNoArmazenamento.Recusa.class, () -> storage.excluir(List.of("x")));
    }

    @Test
    void chaveSecretaNovaVaiSoNoHeaderApikey() {
        SupabaseArmazenamento comChaveNova = new SupabaseArmazenamento(
                Optional.of("http://127.0.0.1:" + servidor.getAddress().getPort()), Optional.of("sb_secret_abc"),
                Optional.empty(), "chamados-anexos", "/storage/v1/upload/resumable/sign", new ObjectMapper());
        comChaveNova.excluir(List.of("x"));
        Requisicao req = recebidas.get("DELETE /storage/v1/object/chamados-anexos");
        assertEquals("sb_secret_abc", req.apikey());
        assertEquals(null, req.authorization());
    }

    @Test
    void exigeUrlEChaveQuandoAtivo() {
        SupabaseArmazenamento semConfig = new SupabaseArmazenamento(Optional.empty(), Optional.empty(), Optional.empty(),
                "chamados-anexos", "/x", new ObjectMapper());
        assertThrows(IllegalStateException.class, semConfig::validarConfiguracao);
    }

    private void responder(HttpExchange troca) throws IOException {
        String metodo = troca.getRequestMethod();
        String caminho = troca.getRequestURI().getPath();
        String corpo = new String(troca.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        recebidas.put(metodo + " " + caminho, new Requisicao(metodo, caminho,
                troca.getRequestHeaders().getFirst("apikey"), troca.getRequestHeaders().getFirst("Authorization"), corpo));

        if (statusForcado != 0) {
            enviar(troca, statusForcado, "{\"error\":\"x\"}");
        } else if (metodo.equals("POST") && caminho.startsWith("/storage/v1/object/upload/sign/")) {
            enviar(troca, 200, "{\"url\":\"/object/upload/sign/chamados-anexos/x?token=tok-123\"}");
        } else if (metodo.equals("POST") && caminho.startsWith("/storage/v1/object/sign/")) {
            String objeto = caminho.substring("/storage/v1".length());
            enviar(troca, 200, "{\"signedURL\":\"" + objeto + "?token=dl-456\"}");
        } else if (metodo.equals("HEAD")) {
            boolean existe = caminho.endsWith("/existe.txt");
            if (existe) {
                troca.getResponseHeaders().add("Content-Length", "42");
            }
            troca.sendResponseHeaders(existe ? 200 : 400, -1);
            troca.close();
        } else {
            enviar(troca, 200, "[]");
        }
    }

    private static void enviar(HttpExchange troca, int status, String corpo) throws IOException {
        byte[] bytes = corpo.getBytes(StandardCharsets.UTF_8);
        troca.getResponseHeaders().add("Content-Type", "application/json");
        troca.sendResponseHeaders(status, bytes.length);
        troca.getResponseBody().write(bytes);
        troca.close();
    }
}
