package br.com.joveretec.chamados.auth;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class AuthResourceTest {

    @Test
    void adminInicialFazLogin() {
        given().contentType(ContentType.JSON)
                .body(Map.of("email", "admin@joveretec.local", "senha", "admin12345"))
                .when().post("/api/auth/login")
                .then().statusCode(200)
                .body("token", notNullValue())
                .body("usuario.perfil", equalTo("ADMIN"));
    }
}
