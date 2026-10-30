package br.com.joveretec.chamados.chamado;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.comoAdmin;
import static br.com.joveretec.chamados.ApiTeste.criarChamado;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.criarProjeto;
import static br.com.joveretec.chamados.FeedTeste.feed;
import static br.com.joveretec.chamados.FeedTeste.publicar;
import static br.com.joveretec.chamados.FeedTeste.tipos;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

@QuarkusTest
class FeedResourceTest {

    private UsuarioTeste dev;
    private long projetoId;
    private long chamadoId;

    @BeforeEach
    void preparar() {
        dev = criarDesenvolvedor();
        projetoId = criarProjeto();
        chamadoId = criarChamado(dev.token(), projetoId, "Erro no relatório", "MEDIA", null);
    }

    @Test
    void aberturaEhOPrimeiroItemComDescricaoEAutor() {
        JsonPath feed = feed(dev.token(), chamadoId, "ASC");
        assertEquals(1, feed.getInt("totalItens"));
        assertEquals("ABERTURA", feed.getString("itens[0].tipo"));
        assertEquals("Descrição de Erro no relatório", feed.getString("itens[0].abertura.descricao"));
        assertEquals(dev.id(), feed.getLong("itens[0].abertura.autor.id"));
    }

    @Test
    void acompanhamentosEEventosSaoIntercaladosEmOrdemCronologica() {
        publicar(dev.token(), chamadoId, "Comecei a análise");
        como(dev.token()).body(Map.of("status", "EM_ANDAMENTO"))
                .patch("/api/chamados/{id}/status", chamadoId).then().statusCode(200);
        publicar(dev.token(), chamadoId, "Encontrei a causa");
        como(dev.token()).post("/api/chamados/{id}/atribuir-a-mim", chamadoId).then().statusCode(200);

        JsonPath feed = feed(dev.token(), chamadoId, "ASC");
        assertEquals(List.of("ABERTURA", "ACOMPANHAMENTO", "EVENTO", "ACOMPANHAMENTO", "EVENTO"), tipos(feed));
        assertEquals("Comecei a análise", feed.getString("itens[1].acompanhamento.texto"));
        assertEquals("STATUS", feed.getString("itens[2].evento.campo"));
        assertEquals("EM_ANDAMENTO", feed.getString("itens[2].evento.valorNovo"));
        assertEquals("RESPONSAVEL_ADICIONADO", feed.getString("itens[4].evento.campo"));
        // O evento CRIACAO do histórico não se repete: a abertura já representa a criação.
        assertFalse(feed.getList("itens.evento.campo").contains("CRIACAO"));
    }

    @Test
    void ordemDescendenteTrazOsMaisRecentesPrimeiro() {
        publicar(dev.token(), chamadoId, "Primeiro");
        publicar(dev.token(), chamadoId, "Segundo");

        JsonPath feed = feed(dev.token(), chamadoId, "DESC");
        assertEquals(List.of("ACOMPANHAMENTO", "ACOMPANHAMENTO", "ABERTURA"), tipos(feed));
        assertEquals("Segundo", feed.getString("itens[0].acompanhamento.texto"));
    }

    @Test
    void feedEhPaginado() {
        for (int i = 1; i <= 4; i++) {
            publicar(dev.token(), chamadoId, "Item " + i);
        }
        como(dev.token()).queryParam("tamanho", 2).queryParam("pagina", 1)
                .get("/api/chamados/{id}/feed", chamadoId)
                .then().statusCode(200)
                .body("totalItens", equalTo(5))
                .body("totalPaginas", equalTo(3))
                .body("itens[0].acompanhamento.texto", equalTo("Item 2"))
                .body("itens[1].acompanhamento.texto", equalTo("Item 3"));
    }

    @Test
    void rascunhosNaoAparecemNoFeed() {
        como(dev.token()).post("/api/chamados/{id}/acompanhamentos/rascunhos", chamadoId).then().statusCode(201);
        assertEquals(List.of("ABERTURA"), tipos(feed(dev.token(), chamadoId, "ASC")));
    }

    @Test
    void permissaoDeAlterarRefleteQuemEstaLendo() {
        publicar(dev.token(), chamadoId, "Meu acompanhamento");
        UsuarioTeste outro = criarDesenvolvedor();

        assertEquals(true, feed(dev.token(), chamadoId, "ASC").getBoolean("itens[1].acompanhamento.podeAlterar"));
        assertEquals(false, feed(outro.token(), chamadoId, "ASC").getBoolean("itens[1].acompanhamento.podeAlterar"));
        assertEquals(true, comoAdmin().queryParam("tamanho", 100).get("/api/chamados/{id}/feed", chamadoId)
                .then().extract().jsonPath().getBoolean("itens[1].acompanhamento.podeAlterar"));
    }

    @Test
    void ordemInvalidaRetorna400() {
        como(dev.token()).queryParam("ordem", "ALEATORIA").get("/api/chamados/{id}/feed", chamadoId)
                .then().statusCode(400);
    }

    @Test
    void chamadoInexistenteRetorna404() {
        como(dev.token()).get("/api/chamados/{id}/feed", 999_999).then().statusCode(404);
    }
}
