package br.com.joveretec.chamados.auth;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.SENHA_PADRAO;
import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

/** Controle do pop-up "Novidades da plataforma": guardado no banco, por usuário. */
@QuarkusTest
class NovidadesVistasTest {

    private UsuarioTeste dev;

    @BeforeEach
    void preparar() {
        dev = criarDesenvolvedor();
    }

    @Test
    void usuarioNovoAindaNaoViuNenhuma() {
        como(dev.token()).get("/api/auth/me").then().statusCode(200).body("novidadesVistasVersao", equalTo(0));
    }

    @Test
    void marcarComoVistoValeEmQualquerNavegador() {
        como(dev.token()).body(Map.of("versao", 1)).put("/api/auth/me/novidades")
                .then().statusCode(200).body("versao", equalTo(1));

        // Um novo login (outro navegador ou dispositivo) já sabe que a versão 1 foi vista.
        given().contentType(ContentType.JSON)
                .body(Map.of("email", dev.email(), "senha", SENHA_PADRAO))
                .post("/api/auth/login")
                .then().statusCode(200)
                .body("usuario.novidadesVistasVersao", equalTo(1));
    }

    @Test
    void reabrirNovidadesAntigasNaoVoltaAVersao() {
        como(dev.token()).body(Map.of("versao", 3)).put("/api/auth/me/novidades").then().statusCode(200);

        como(dev.token()).body(Map.of("versao", 2)).put("/api/auth/me/novidades")
                .then().statusCode(200).body("versao", equalTo(3));
        como(dev.token()).get("/api/auth/me").then().body("novidadesVistasVersao", equalTo(3));
    }

    @Test
    void cadaUsuarioTemOSeuControle() {
        UsuarioTeste outro = criarDesenvolvedor();
        como(dev.token()).body(Map.of("versao", 1)).put("/api/auth/me/novidades").then().statusCode(200);

        como(outro.token()).get("/api/auth/me").then().body("novidadesVistasVersao", equalTo(0));
    }

    @Test
    void recusaVersaoInvalida() {
        como(dev.token()).body(Map.of("versao", 0)).put("/api/auth/me/novidades").then().statusCode(400);
        como(dev.token()).body(Map.of()).put("/api/auth/me/novidades").then().statusCode(400);
    }
}
