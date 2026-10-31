package br.com.joveretec.chamados.auth;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.SENHA_PADRAO;
import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.comoAdmin;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

/** Paleta pessoal: cada usuário tem a sua, que não afeta os outros nem a paleta global. */
@QuarkusTest
class PaletaPessoalTest {

    private static final Map<String, String> AZUL =
            Map.of("fundo", "#0f172a", "superficie", "#334155", "destaque", "#1e88e5", "texto", "#f8fafc");

    private UsuarioTeste dev;

    @BeforeEach
    void preparar() {
        dev = criarDesenvolvedor();
    }

    @Test
    void semPaletaPessoalOMeTrazNulo() {
        como(dev.token()).get("/api/auth/me")
                .then().statusCode(200)
                .body("paleta", nullValue());
    }

    @Test
    void salvaEmMaiusculasEVoltaNoMeENoLogin() {
        como(dev.token()).body(AZUL).put("/api/auth/me/paleta")
                .then().statusCode(200)
                .body("destaque", equalTo("#1E88E5"));

        como(dev.token()).get("/api/auth/me")
                .then().body("paleta.fundo", equalTo("#0F172A"))
                .body("paleta.texto", equalTo("#F8FAFC"));

        given().contentType(ContentType.JSON)
                .body(Map.of("email", dev.email(), "senha", SENHA_PADRAO))
                .post("/api/auth/login")
                .then().statusCode(200)
                .body("usuario.paleta.superficie", equalTo("#334155"));
    }

    @Test
    void naoAfetaOutrosUsuariosNemAPaletaGlobal() {
        UsuarioTeste outro = criarDesenvolvedor();
        String destaqueGlobal = given().get("/api/configuracoes").then().extract().path("paleta.destaque");

        como(dev.token()).body(AZUL).put("/api/auth/me/paleta").then().statusCode(200);

        como(outro.token()).get("/api/auth/me").then().body("paleta", nullValue());
        given().get("/api/configuracoes").then().body("paleta.destaque", equalTo(destaqueGlobal));
    }

    @Test
    void restaurarPadraoVoltaASeguirAGlobal() {
        como(dev.token()).body(AZUL).put("/api/auth/me/paleta").then().statusCode(200);

        como(dev.token()).delete("/api/auth/me/paleta").then().statusCode(204);

        como(dev.token()).get("/api/auth/me").then().body("paleta", nullValue());
    }

    @Test
    void recusaCorInvalidaOuFaltando() {
        como(dev.token()).body(Map.of("fundo", "preto", "superficie", "#334155", "destaque", "#1E88E5", "texto", "#FFFFFF"))
                .put("/api/auth/me/paleta")
                .then().statusCode(400)
                .body("detalhes.campo", hasItem("fundo"));

        como(dev.token()).body(Map.of("fundo", "#000000")).put("/api/auth/me/paleta")
                .then().statusCode(400);

        como(dev.token()).get("/api/auth/me").then().body("paleta", nullValue());
    }

    @Test
    void listaDeUsuariosNaoExpoeAPaletaDosOutros() {
        como(dev.token()).body(AZUL).put("/api/auth/me/paleta").then().statusCode(200);

        comoAdmin().get("/api/usuarios/{id}", dev.id())
                .then().statusCode(200)
                .body("$", not(hasKey("paleta")));
    }
}
