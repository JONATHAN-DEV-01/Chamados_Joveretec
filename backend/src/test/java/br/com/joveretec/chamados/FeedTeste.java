package br.com.joveretec.chamados;

import io.restassured.path.json.JsonPath;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.como;
import static io.restassured.RestAssured.given;

/** Atalhos de teste para feed, acompanhamentos e anexos (armazenamento local). */
public final class FeedTeste {

    private FeedTeste() {
    }

    public static long publicar(String token, long chamadoId, String texto, String tipo, Integer tempo,
                                boolean concluir, Long rascunhoId) {
        Integer id = como(token).body(corpo(texto, tipo, tempo, concluir, rascunhoId))
                .post("/api/chamados/{id}/acompanhamentos", chamadoId)
                .then().statusCode(201)
                .extract().path("id");
        return id.longValue();
    }

    public static long publicar(String token, long chamadoId, String texto) {
        return publicar(token, chamadoId, texto, null, null, false, null);
    }

    public static Map<String, Object> corpo(String texto, String tipo, Integer tempo, boolean concluir, Long rascunhoId) {
        Map<String, Object> corpo = new HashMap<>();
        corpo.put("texto", texto);
        corpo.put("tipo", tipo);
        corpo.put("tempoGastoMinutos", tempo);
        corpo.put("concluirChamado", concluir);
        corpo.put("rascunhoId", rascunhoId);
        return corpo;
    }

    public static long criarRascunho(String token, long chamadoId) {
        Integer id = como(token).post("/api/chamados/{id}/acompanhamentos/rascunhos", chamadoId)
                .then().statusCode(201).extract().path("id");
        return id.longValue();
    }

    /** Pede autorização de envio; devolve a resposta (anexo + envio). */
    public static JsonPath solicitarEnvio(String token, long chamadoId, String nome, String tipo, long tamanho,
                                          Long acompanhamentoId) {
        Map<String, Object> corpo = new HashMap<>();
        corpo.put("nome", nome);
        corpo.put("tipoMime", tipo);
        corpo.put("tamanhoBytes", tamanho);
        corpo.put("acompanhamentoId", acompanhamentoId);
        return como(token).body(corpo).post("/api/chamados/{id}/anexos", chamadoId)
                .then().statusCode(201).extract().jsonPath();
    }

    /** Envia o conteúdo como o navegador faria no armazenamento local (PUT na URL autorizada). */
    public static void enviar(JsonPath autorizacao, String conteudo) {
        String url = autorizacao.getString("envio.url");
        String tipo = autorizacao.getString("envio.cabecalhos['Content-Type']");
        given().contentType(tipo).body(conteudo.getBytes(StandardCharsets.UTF_8))
                .urlEncodingEnabled(false)
                .put(url)
                .then().statusCode(204);
    }

    public static long anexarConcluido(String token, long chamadoId, String nome, String conteudo, Long acompanhamentoId) {
        JsonPath autorizacao = solicitarEnvio(token, chamadoId, nome, "text/plain", conteudo.length(), acompanhamentoId);
        enviar(autorizacao, conteudo);
        long anexoId = autorizacao.getLong("anexo.id");
        como(token).post("/api/anexos/{id}/confirmar", anexoId).then().statusCode(200);
        return anexoId;
    }

    public static JsonPath feed(String token, long chamadoId, String ordem) {
        return como(token).queryParam("ordem", ordem).queryParam("tamanho", 100)
                .get("/api/chamados/{id}/feed", chamadoId)
                .then().statusCode(200).extract().jsonPath();
    }

    public static List<String> tipos(JsonPath feed) {
        return feed.getList("itens.tipo");
    }
}
