package br.com.joveretec.chamados.auth;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.ADMIN_EMAIL;
import static br.com.joveretec.chamados.ApiTeste.ADMIN_SENHA;
import static br.com.joveretec.chamados.ApiTeste.SENHA_PADRAO;
import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.comoAdmin;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.login;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class AuthResourceTest {

    @Test
    void adminInicialFazLogin() {
        given().contentType(ContentType.JSON)
                .body(Map.of("email", ADMIN_EMAIL, "senha", ADMIN_SENHA))
                .when().post("/api/auth/login")
                .then().statusCode(200)
                .body("token", notNullValue())
                .body("expiraEm", notNullValue())
                .body("usuario.email", equalTo(ADMIN_EMAIL))
                .body("usuario.perfil", equalTo("ADMIN"));
    }

    @Test
    void loginIgnoraMaiusculasNoEmail() {
        given().contentType(ContentType.JSON)
                .body(Map.of("email", "ADMIN@Joveretec.Local", "senha", ADMIN_SENHA))
                .when().post("/api/auth/login")
                .then().statusCode(200);
    }

    @Test
    void senhaErradaRetorna401Padronizado() {
        given().contentType(ContentType.JSON)
                .body(Map.of("email", ADMIN_EMAIL, "senha", "errada"))
                .when().post("/api/auth/login")
                .then().statusCode(401)
                .body("codigo", equalTo("NAO_AUTENTICADO"))
                .body("mensagem", equalTo("E-mail ou senha inválidos."))
                .body("timestamp", notNullValue());
    }

    @Test
    void emailInexistenteRetornaMesmaMensagem() {
        given().contentType(ContentType.JSON)
                .body(Map.of("email", "ninguem@teste.local", "senha", "qualquer"))
                .when().post("/api/auth/login")
                .then().statusCode(401)
                .body("mensagem", equalTo("E-mail ou senha inválidos."));
    }

    @Test
    void loginValidaCampos() {
        given().contentType(ContentType.JSON)
                .body(Map.of("email", "invalido", "senha", ""))
                .when().post("/api/auth/login")
                .then().statusCode(400)
                .body("codigo", equalTo("VALIDACAO"))
                .body("detalhes.campo", hasItem("email"))
                .body("detalhes.campo", hasItem("senha"));
    }

    @Test
    void usuarioDesativadoNaoFazLogin() {
        UsuarioTeste dev = criarDesenvolvedor();
        comoAdmin().post("/api/usuarios/{id}/desativar", dev.id()).then().statusCode(200);

        given().contentType(ContentType.JSON)
                .body(Map.of("email", dev.email(), "senha", SENHA_PADRAO))
                .when().post("/api/auth/login")
                .then().statusCode(401);
    }

    @Test
    void rotaProtegidaSemTokenRetorna401() {
        given().when().get("/api/chamados")
                .then().statusCode(401)
                .body("codigo", equalTo("NAO_AUTENTICADO"));
    }

    @Test
    void tokenInvalidoRetorna401() {
        como("token.invalido.qualquer").when().get("/api/chamados")
                .then().statusCode(401)
                .body("codigo", equalTo("NAO_AUTENTICADO"));
    }

    @Test
    void meRetornaUsuarioDoToken() {
        UsuarioTeste dev = criarDesenvolvedor();
        como(dev.token()).when().get("/api/auth/me")
                .then().statusCode(200)
                .body("id", equalTo((int) dev.id()))
                .body("perfil", equalTo("DESENVOLVEDOR"));
    }

    @Test
    void usuarioTrocaPropriaSenha() {
        UsuarioTeste dev = criarDesenvolvedor();
        como(dev.token())
                .body(Map.of("senhaAtual", "errada-123", "novaSenha", "nova-senha-123"))
                .put("/api/auth/me/senha")
                .then().statusCode(422);

        como(dev.token())
                .body(Map.of("senhaAtual", SENHA_PADRAO, "novaSenha", "nova-senha-123"))
                .put("/api/auth/me/senha")
                .then().statusCode(204);

        login(dev.email(), "nova-senha-123");
    }
}
