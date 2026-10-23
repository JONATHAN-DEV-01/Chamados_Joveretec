package br.com.joveretec.chamados.configuracao;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.comoAdmin;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;

@QuarkusTest
class ConfiguracaoResourceTest {

    private static final Map<String, Object> PADRAO = configuracao("#171717", "#444444", "#DA0037", "#EDEDED",
            "Chamados Joveretec", 20);

    @AfterEach
    void restaurarPadrao() {
        comoAdmin().body(PADRAO).put("/api/configuracoes").then().statusCode(200);
    }

    @Test
    void leituraPublicaRetornaPaletaPadrao() {
        given().get("/api/configuracoes")
                .then().statusCode(200)
                .body("paleta.fundo", equalTo("#171717"))
                .body("paleta.superficie", equalTo("#444444"))
                .body("paleta.destaque", equalTo("#DA0037"))
                .body("paleta.texto", equalTo("#EDEDED"))
                .body("geral.nomeSistema", equalTo("Chamados Joveretec"))
                .body("geral.tamanhoPaginaPadrao", equalTo(20));
    }

    @Test
    void adminAlteraPaletaEALeituraReflete() {
        comoAdmin().body(configuracao("#000000", "#222222", "#ff0000", "#ffffff", "Meu Sistema", 50))
                .put("/api/configuracoes")
                .then().statusCode(200)
                .body("paleta.destaque", equalTo("#FF0000"));

        given().get("/api/configuracoes")
                .then().statusCode(200)
                .body("paleta.fundo", equalTo("#000000"))
                .body("paleta.destaque", equalTo("#FF0000"))
                .body("geral.nomeSistema", equalTo("Meu Sistema"))
                .body("geral.tamanhoPaginaPadrao", equalTo(50));
    }

    @Test
    void corInvalidaRetorna400() {
        comoAdmin().body(configuracao("preto", "#222222", "#FF0000", "#FFFFFF", "X", 20))
                .put("/api/configuracoes")
                .then().statusCode(400)
                .body("codigo", equalTo("VALIDACAO"))
                .body("detalhes.campo", hasItem("fundo"));
    }

    @Test
    void alteracaoSemTokenRetorna401() {
        given().contentType("application/json").body(PADRAO).put("/api/configuracoes")
                .then().statusCode(401);
    }

    private static Map<String, Object> configuracao(String fundo, String superficie, String destaque, String texto,
                                                    String nome, int tamanho) {
        return Map.of(
                "paleta", Map.of("fundo", fundo, "superficie", superficie, "destaque", destaque, "texto", texto),
                "geral", Map.of("nomeSistema", nome, "tamanhoPaginaPadrao", tamanho));
    }
}
