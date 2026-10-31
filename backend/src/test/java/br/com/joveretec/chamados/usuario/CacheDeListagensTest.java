package br.com.joveretec.chamados.usuario;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.ValidatableResponse;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.comoAdmin;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.unico;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;

/**
 * As listagens de projetos e usuários têm cache, que precisa ser limpo a cada alteração. Cada
 * teste repete a mesma consulta (mesma chave de cache) antes e depois de alterar.
 */
@QuarkusTest
class CacheDeListagensTest {

    @Test
    void projetoCriadoRenomeadoEArquivadoApareceNaHora() {
        String prefixo = unico("Cache");
        listarProjetos(prefixo).body("itens", empty()); // a consulta vazia fica no cache

        Integer id = comoAdmin().body(Map.of("nome", prefixo + " A", "descricao", "x")).post("/api/projetos")
                .then().statusCode(201).extract().path("id");
        listarProjetos(prefixo).body("itens.id", hasItem(id));

        comoAdmin().body(Map.of("nome", prefixo + " B", "descricao", "x")).put("/api/projetos/{id}", id)
                .then().statusCode(200);
        listarProjetos(prefixo).body("itens.nome", hasItem(prefixo + " B"));

        comoAdmin().post("/api/projetos/{id}/arquivar", id).then().statusCode(200);
        listarProjetos(prefixo).body("itens.id", not(hasItem(id)));

        comoAdmin().post("/api/projetos/{id}/desarquivar", id).then().statusCode(200);
        listarProjetos(prefixo).body("itens.id", hasItem(id));
    }

    @Test
    void usuarioDesativadoEReativadoApareceNaHora() {
        UsuarioTeste dev = criarDesenvolvedor();
        listarAtivos(dev.email()).body("itens.id", hasItem((int) dev.id()));

        comoAdmin().post("/api/usuarios/{id}/desativar", dev.id()).then().statusCode(200);
        listarAtivos(dev.email()).body("itens.id", not(hasItem((int) dev.id())));

        comoAdmin().post("/api/usuarios/{id}/reativar", dev.id()).then().statusCode(200);
        listarAtivos(dev.email()).body("itens.id", hasItem((int) dev.id()));
    }

    private static ValidatableResponse listarProjetos(String busca) {
        return comoAdmin().queryParam("busca", busca).get("/api/projetos").then().statusCode(200);
    }

    private static ValidatableResponse listarAtivos(String busca) {
        return comoAdmin().queryParam("busca", busca).queryParam("ativo", true).get("/api/usuarios")
                .then().statusCode(200);
    }
}
