package br.com.joveretec.chamados.usuario;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.comoAdmin;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.criarProjeto;
import static br.com.joveretec.chamados.ApiTeste.unico;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.hasItem;

@QuarkusTest
class UsuarioProjetoResourceTest {

    @Test
    void emailDuplicadoRetorna409() {
        UsuarioTeste dev = criarDesenvolvedor();
        comoAdmin()
                .body(Map.of("nome", "Outro", "email", dev.email().toUpperCase(), "senha", "12345678",
                        "perfil", "DESENVOLVEDOR"))
                .post("/api/usuarios")
                .then().statusCode(409)
                .body("codigo", equalTo("CONFLITO"));
    }

    @Test
    void adminAlteraPerfilDoUsuario() {
        UsuarioTeste dev = criarDesenvolvedor();
        comoAdmin()
                .body(Map.of("nome", dev.nome(), "email", dev.email(), "perfil", "ADMIN"))
                .put("/api/usuarios/{id}", dev.id())
                .then().statusCode(200)
                .body("perfil", equalTo("ADMIN"));
    }

    @Test
    void adminNaoDesativaASiMesmo() {
        Integer adminId = comoAdmin().get("/api/auth/me").then().extract().path("id");
        comoAdmin().post("/api/usuarios/{id}/desativar", adminId)
                .then().statusCode(422)
                .body("codigo", equalTo("REGRA_NEGOCIO"));
    }

    @Test
    void listaUsuariosFiltrandoPorPerfil() {
        criarDesenvolvedor();
        comoAdmin().queryParam("perfil", "DESENVOLVEDOR").queryParam("tamanho", 100).get("/api/usuarios")
                .then().statusCode(200)
                .body("itens.perfil", everyItem(equalTo("DESENVOLVEDOR")));
    }

    @Test
    void perfilInvalidoNoFiltroRetorna400() {
        comoAdmin().queryParam("perfil", "GERENTE").get("/api/usuarios")
                .then().statusCode(400);
    }

    @Test
    void projetoArquivadoSaiDaListagemPadrao() {
        long projetoId = criarProjeto();
        comoAdmin().post("/api/projetos/{id}/arquivar", projetoId).then().statusCode(200);

        comoAdmin().queryParam("tamanho", 100).get("/api/projetos")
                .then().body("itens.id", not(hasItem((int) projetoId)));
        comoAdmin().queryParam("tamanho", 100).queryParam("incluirArquivados", true).get("/api/projetos")
                .then().body("itens.id", hasItem((int) projetoId));

        comoAdmin().post("/api/projetos/{id}/desarquivar", projetoId)
                .then().statusCode(200).body("arquivado", equalTo(false));
    }

    @Test
    void nomeDeProjetoDuplicadoRetorna409() {
        String nome = unico("Duplicado");
        comoAdmin().body(Map.of("nome", nome)).post("/api/projetos").then().statusCode(201);
        comoAdmin().body(Map.of("nome", nome.toLowerCase())).post("/api/projetos")
                .then().statusCode(409);
    }

    @Test
    void healthCheckReady() {
        given().get("/q/health/ready")
                .then().statusCode(200)
                .body("status", equalTo("UP"));
    }

    @Test
    void rotaInexistenteRetorna404Padronizado() {
        comoAdmin().get("/api/nao-existe")
                .then().statusCode(404)
                .body("codigo", equalTo("NAO_ENCONTRADO"));
    }
}
