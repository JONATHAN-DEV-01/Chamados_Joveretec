package br.com.joveretec.chamados;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.comoAdmin;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.criarProjeto;
import static br.com.joveretec.chamados.ApiTeste.unico;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
class PermissoesTest {

    private UsuarioTeste dev;

    @BeforeEach
    void preparar() {
        dev = criarDesenvolvedor();
    }

    @Test
    void desenvolvedorNaoGerenciaUsuarios() {
        como(dev.token())
                .body(Map.of("nome", "X", "email", unico("x") + "@teste.local", "senha", "12345678",
                        "perfil", "ADMIN"))
                .post("/api/usuarios")
                .then().statusCode(403)
                .body("codigo", equalTo("ACESSO_NEGADO"));

        como(dev.token()).post("/api/usuarios/{id}/desativar", dev.id()).then().statusCode(403);
        como(dev.token())
                .body(Map.of("nome", "X", "email", dev.email(), "perfil", "ADMIN"))
                .put("/api/usuarios/{id}", dev.id())
                .then().statusCode(403);
    }

    @Test
    void desenvolvedorNaoGerenciaProjetos() {
        long projetoId = criarProjeto();
        como(dev.token()).body(Map.of("nome", unico("P"))).post("/api/projetos").then().statusCode(403);
        como(dev.token()).body(Map.of("nome", unico("P"))).put("/api/projetos/{id}", projetoId)
                .then().statusCode(403);
        como(dev.token()).post("/api/projetos/{id}/arquivar", projetoId).then().statusCode(403);
    }

    @Test
    void desenvolvedorNaoAlteraConfiguracoes() {
        como(dev.token())
                .body(Map.of("paleta", Map.of("fundo", "#000000", "superficie", "#111111",
                                "destaque", "#222222", "texto", "#FFFFFF"),
                        "geral", Map.of("nomeSistema", "X", "tamanhoPaginaPadrao", 20)))
                .put("/api/configuracoes")
                .then().statusCode(403);
    }

    @Test
    void desenvolvedorConsultaUsuariosProjetosChamadosEDashboard() {
        como(dev.token()).get("/api/usuarios").then().statusCode(200);
        como(dev.token()).get("/api/projetos").then().statusCode(200);
        como(dev.token()).get("/api/chamados").then().statusCode(200);
        como(dev.token()).get("/api/dashboard/por-status").then().statusCode(200);
    }

    @Test
    void adminGerenciaProjetosEUsuarios() {
        long projetoId = criarProjeto();
        comoAdmin().post("/api/projetos/{id}/arquivar", projetoId)
                .then().statusCode(200).body("arquivado", equalTo(true));
        comoAdmin().post("/api/usuarios/{id}/desativar", dev.id())
                .then().statusCode(200).body("ativo", equalTo(false));
    }

    @Test
    void usuarioDesativadoComTokenAindaValidoNaoAltera() {
        long projetoId = criarProjeto();
        comoAdmin().post("/api/usuarios/{id}/desativar", dev.id()).then().statusCode(200);

        como(dev.token())
                .body(Map.of("projetoId", projetoId, "titulo", "T", "descricao", "D", "urgencia", "BAIXA"))
                .post("/api/chamados")
                .then().statusCode(403);
    }
}
