package br.com.joveretec.chamados.chamado;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import br.com.joveretec.chamados.chamado.control.AnexoService;
import br.com.joveretec.chamados.chamado.entity.AnexoRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.criarChamado;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.criarProjeto;
import static br.com.joveretec.chamados.FeedTeste.anexarConcluido;
import static br.com.joveretec.chamados.FeedTeste.enviar;
import static br.com.joveretec.chamados.FeedTeste.feed;
import static br.com.joveretec.chamados.FeedTeste.solicitarEnvio;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Anexos colados/arrastados no texto: rascunhos sem chamado, limites, links em lote e limpeza. */
@QuarkusTest
class AnexosNoTextoTest {

    @Inject
    AnexoRepository anexos;

    @Inject
    AnexoService servico;

    @Inject
    EntityManager entityManager;

    private UsuarioTeste autor;
    private UsuarioTeste outroDev;
    private long projetoId;

    @BeforeEach
    void preparar() {
        autor = criarDesenvolvedor();
        outroDev = criarDesenvolvedor();
        projetoId = criarProjeto();
    }

    @Test
    void imagemColadaAntesDeCriarOChamadoEhLigadaAAbertura() {
        long anexoId = rascunhoConcluido(autor, "print.png", "imagem");
        assertTrue(caminho(anexoId).startsWith("rascunhos/usuarios/" + autor.id() + "/" + anexoId + "-"));

        String descricao = "Veja o erro:\n\n![print.png](anexo:" + anexoId + ")";
        long chamadoId = criarComAnexos(descricao, List.of(anexoId));

        JsonPath feed = feed(autor.token(), chamadoId, "ASC");
        assertEquals(descricao, feed.getString("itens[0].abertura.descricao"));
        assertEquals(anexoId, feed.getLong("itens[0].abertura.anexos[0].id"));
        // O anexo faz parte da abertura: não gera evento "anexou" separado.
        assertFalse(feed.getList("itens.evento.campo").contains("ANEXO_ADICIONADO"));
        // Ligado ao chamado, qualquer pessoa da equipe vê o anexo.
        como(outroDev.token()).get("/api/anexos/{id}/download", anexoId).then().statusCode(200);
    }

    @Test
    void rascunhoDeChamadoSoEhVistoEUsadoPorQuemEnviou() {
        long anexoId = rascunhoConcluido(autor, "segredo.txt", "abc");

        como(outroDev.token()).get("/api/anexos/{id}/download", anexoId).then().statusCode(404);
        como(outroDev.token()).queryParam("ids", anexoId).get("/api/anexos/links").then().body("", empty());
        como(outroDev.token()).delete("/api/anexos/{id}", anexoId).then().statusCode(404);

        Map<String, Object> corpo = corpoChamado("Tentativa", List.of(anexoId));
        como(outroDev.token()).body(corpo).post("/api/chamados").then().statusCode(422)
                .body("codigo", equalTo("REGRA_NEGOCIO"));
    }

    @Test
    void rascunhoNaoPodeSerUsadoEmDoisChamados() {
        long anexoId = rascunhoConcluido(autor, "a.txt", "abc");
        criarComAnexos("Primeiro", List.of(anexoId));
        como(autor.token()).body(corpoChamado("Segundo", List.of(anexoId))).post("/api/chamados")
                .then().statusCode(422);
    }

    @Test
    void pendenteNaoPodeSerUsadoNoChamado() {
        long anexoId = solicitarRascunho(autor, "metade.txt", 3).getLong("anexo.id");
        como(autor.token()).body(corpoChamado("Cedo demais", List.of(anexoId))).post("/api/chamados")
                .then().statusCode(422);
    }

    @Test
    void recusaArquivoAcimaDoLimiteDeclaradoOuReal() {
        como(autor.token()).body(pedido("grande.zip", 5000)).post("/api/anexos/rascunhos")
                .then().statusCode(422)
                .body("mensagem", containsString("limite"));

        // Declarou pouco, mas enviou mais que o limite (2 KB nos testes): recusado na confirmação.
        JsonPath autorizacao = solicitarRascunho(autor, "mentiroso.txt", 10);
        enviar(autorizacao, "x".repeat(3000));
        como(autor.token()).post("/api/anexos/{id}/confirmar", autorizacao.getLong("anexo.id"))
                .then().statusCode(422);
    }

    @Test
    void recusaExtensaoBloqueadaTambemNoChamadoExistente() {
        como(autor.token()).body(pedido("instalador.EXE", 10)).post("/api/anexos/rascunhos")
                .then().statusCode(422)
                .body("mensagem", equalTo("Arquivos .exe não são permitidos."));

        long chamadoId = criarChamado(autor.token(), projetoId, "Existente", "MEDIA", null);
        como(autor.token()).body(pedido("script.bat", 10)).post("/api/chamados/{id}/anexos", chamadoId)
                .then().statusCode(422);
    }

    @Test
    void linksEmLoteIgnoramPendentesEInexistentes() {
        long chamadoId = criarChamado(autor.token(), projetoId, "Com imagens", "MEDIA", null);
        long a = anexarConcluido(autor.token(), chamadoId, "a.png", "aaa", null);
        long b = anexarConcluido(autor.token(), chamadoId, "b.png", "bbb", null);
        long pendente = solicitarEnvio(autor.token(), chamadoId, "c.png", "image/png", 3, null).getLong("anexo.id");

        JsonPath links = como(outroDev.token())
                .queryParam("ids", a + "," + b)
                .queryParam("ids", pendente)
                .queryParam("ids", 999_999)
                .queryParam("inline", true)
                .get("/api/anexos/links")
                .then().statusCode(200)
                .body("", hasSize(2))
                .extract().jsonPath();
        assertEquals(List.of(a, b), links.getList("anexoId", Long.class));
        String url = links.getString("find { it.anexoId == " + a + " }.url");
        assertEquals("aaa", given().urlEncodingEnabled(false).get(url).asString());
    }

    @Test
    void linksEmLoteValidamOsIds() {
        como(autor.token()).queryParam("ids", "abc").get("/api/anexos/links").then().statusCode(400);
    }

    @Test
    void limpezaRemoveRascunhosDeChamadoNuncaCriado() {
        long antigo = rascunhoConcluido(autor, "esquecido.png", "x");
        long recente = rascunhoConcluido(autor, "recente.png", "y");
        QuarkusTransaction.requiringNew().run(() -> entityManager
                .createNativeQuery("update anexo set criado_em = now() - interval '25 hours' where id = :id")
                .setParameter("id", antigo).executeUpdate());

        assertTrue(servico.limparPendentes() >= 1);
        assertTrue(anexos.findByIdOptional(antigo).isEmpty());
        assertTrue(anexos.findByIdOptional(recente).isPresent());
    }

    @Test
    void configuracoesPublicasTrazemOsLimites() {
        given().get("/api/configuracoes").then().statusCode(200)
                .body("anexos.tamanhoMaximoBytes", equalTo(2048))
                .body("anexos.extensoesBloqueadas", org.hamcrest.Matchers.hasItem("exe"));
    }

    @Test
    void resumoDasUltimasAtualizacoesMostraONomeDoAnexo() {
        long chamadoId = criarChamado(autor.token(), projetoId, "Resumo", "MEDIA", autor.id());
        como(autor.token()).body(Map.of("texto", "Print: ![tela.png](anexo:12) e [log.txt](anexo:13)"))
                .post("/api/chamados/{id}/acompanhamentos", chamadoId).then().statusCode(201);
        como(autor.token()).get("/api/dashboard/ultimas-atualizacoes")
                .then().body("[0].resumo", startsWith("Print: 📎 tela.png e 📎 log.txt"));
    }

    private long criarComAnexos(String descricao, List<Long> anexoIds) {
        Map<String, Object> corpo = corpoChamado("Com print", anexoIds);
        corpo.put("descricao", descricao);
        Integer id = como(autor.token()).body(corpo).post("/api/chamados").then().statusCode(201).extract().path("id");
        return id.longValue();
    }

    private Map<String, Object> corpoChamado(String titulo, List<Long> anexoIds) {
        Map<String, Object> corpo = new HashMap<>();
        corpo.put("projetoId", projetoId);
        corpo.put("titulo", titulo);
        corpo.put("descricao", "Descrição de " + titulo);
        corpo.put("urgencia", "MEDIA");
        corpo.put("anexoIds", anexoIds);
        return corpo;
    }

    private static Map<String, Object> pedido(String nome, long tamanho) {
        return Map.of("nome", nome, "tipoMime", "application/octet-stream", "tamanhoBytes", tamanho);
    }

    private static JsonPath solicitarRascunho(UsuarioTeste usuario, String nome, long tamanho) {
        return como(usuario.token()).body(pedido(nome, tamanho)).post("/api/anexos/rascunhos")
                .then().statusCode(201).extract().jsonPath();
    }

    private static long rascunhoConcluido(UsuarioTeste usuario, String nome, String conteudo) {
        JsonPath autorizacao = solicitarRascunho(usuario, nome, conteudo.length());
        enviar(autorizacao, conteudo);
        long anexoId = autorizacao.getLong("anexo.id");
        como(usuario.token()).post("/api/anexos/{id}/confirmar", anexoId).then().statusCode(200);
        return anexoId;
    }

    private String caminho(long anexoId) {
        return QuarkusTransaction.requiringNew().call(() -> anexos.findById(anexoId).getCaminho());
    }
}
