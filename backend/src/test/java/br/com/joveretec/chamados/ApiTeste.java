package br.com.joveretec.chamados;

import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static io.restassured.RestAssured.given;

/**
 * Atalhos para os testes de API. Cada teste cria os próprios dados (nomes únicos),
 * então os testes não dependem de ordem nem de limpeza do banco.
 */
public final class ApiTeste {

    public static final String ADMIN_EMAIL = "admin@joveretec.local";
    public static final String ADMIN_SENHA = "admin12345";
    public static final String SENHA_PADRAO = "senha-segura-123";

    private static final AtomicReference<String> TOKEN_ADMIN = new AtomicReference<>();

    private ApiTeste() {
    }

    public static String unico(String prefixo) {
        return prefixo + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    public static String login(String email, String senha) {
        return given().contentType(ContentType.JSON)
                .body(Map.of("email", email, "senha", senha))
                .post("/api/auth/login")
                .then().statusCode(200)
                .extract().path("token");
    }

    public static String tokenAdmin() {
        return TOKEN_ADMIN.updateAndGet(atual -> atual != null ? atual : login(ADMIN_EMAIL, ADMIN_SENHA));
    }

    public static RequestSpecification comoAdmin() {
        return como(tokenAdmin());
    }

    public static RequestSpecification como(String token) {
        return given().contentType(ContentType.JSON).auth().oauth2(token);
    }

    /** Cria um usuário (via admin) e devolve seus dados de acesso. */
    public static UsuarioTeste criarUsuario(String perfil) {
        String nome = unico("Usuario");
        String email = nome.toLowerCase() + "@teste.local";
        Integer id = comoAdmin()
                .body(Map.of("nome", nome, "email", email, "senha", SENHA_PADRAO, "perfil", perfil))
                .post("/api/usuarios")
                .then().statusCode(201)
                .extract().path("id");
        return new UsuarioTeste(id.longValue(), nome, email, login(email, SENHA_PADRAO));
    }

    public static UsuarioTeste criarDesenvolvedor() {
        return criarUsuario("DESENVOLVEDOR");
    }

    public static long criarProjeto() {
        Integer id = comoAdmin()
                .body(Map.of("nome", unico("Projeto"), "descricao", "Projeto de teste"))
                .post("/api/projetos")
                .then().statusCode(201)
                .extract().path("id");
        return id.longValue();
    }

    public static long criarChamado(String token, long projetoId, String titulo, String urgencia, Long responsavelId) {
        Map<String, Object> corpo = new HashMap<>();
        corpo.put("projetoId", projetoId);
        corpo.put("titulo", titulo);
        corpo.put("descricao", "Descrição de " + titulo);
        corpo.put("urgencia", urgencia);
        corpo.put("responsavelId", responsavelId);
        Integer id = como(token).body(corpo)
                .post("/api/chamados")
                .then().statusCode(201)
                .extract().path("id");
        return id.longValue();
    }

    public record UsuarioTeste(long id, String nome, String email, String token) {
    }
}
