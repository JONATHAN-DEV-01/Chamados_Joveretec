package br.com.joveretec.chamados.chamado;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.specification.RequestSpecification;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.criarChamado;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.criarProjeto;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
class FiltrosChamadoTest {

    private UsuarioTeste dev;
    private UsuarioTeste outroDev;
    private long projetoId;

    /*
     * Fila do projeto (posição: título, urgência, responsável, status):
     * 1: "Login quebrado"       BAIXA    dev        ABERTO
     * 2: "Relatório lento"      CRITICA  outroDev   EM_ANDAMENTO
     * 3: "Ajustar layout"       ALTA     -          ABERTO
     * 4: "Documentar API"       MEDIA    outroDev   ABERTO
     * -: "Erro no login social" CRITICA  dev        CONCLUIDO (fora da fila)
     */
    @BeforeEach
    void preparar() {
        dev = criarDesenvolvedor();
        outroDev = criarDesenvolvedor();
        projetoId = criarProjeto();
        criarChamado(dev.token(), projetoId, "Login quebrado", "BAIXA", dev.id());
        long relatorio = criarChamado(dev.token(), projetoId, "Relatório lento", "CRITICA", outroDev.id());
        criarChamado(dev.token(), projetoId, "Ajustar layout", "ALTA", null);
        long erroLogin = criarChamado(dev.token(), projetoId, "Erro no login social", "CRITICA", dev.id());
        criarChamado(dev.token(), projetoId, "Documentar API", "MEDIA", outroDev.id());
        alterarStatus(relatorio, "EM_ANDAMENTO");
        alterarStatus(erroLogin, "CONCLUIDO");
    }

    @Test
    void ordenaPorUrgenciaEDepoisPorPosicao() {
        doProjeto().get("/api/chamados")
                .then().statusCode(200)
                .body("totalItens", equalTo(5))
                .body("itens.titulo", contains("Relatório lento", "Erro no login social", "Ajustar layout",
                        "Documentar API", "Login quebrado"));
    }

    @Test
    void ordenaSomentePorPosicaoQuandoSolicitado() {
        // O concluído saiu da fila (sem posição) e vai para o fim.
        doProjeto().queryParam("ordem", "POSICAO").get("/api/chamados")
                .then().statusCode(200)
                .body("itens.titulo", contains("Login quebrado", "Relatório lento", "Ajustar layout",
                        "Documentar API", "Erro no login social"));
    }

    @Test
    void filtraPorResponsavel() {
        doProjeto().queryParam("responsavelId", outroDev.id()).get("/api/chamados")
                .then().body("itens.titulo", contains("Relatório lento", "Documentar API"));
    }

    @Test
    void filtraSemResponsavel() {
        doProjeto().queryParam("semResponsavel", true).get("/api/chamados")
                .then().body("itens.titulo", contains("Ajustar layout"));
    }

    @Test
    void filtraPorVariosStatus() {
        doProjeto().queryParam("status", "EM_ANDAMENTO,CONCLUIDO").get("/api/chamados")
                .then().body("itens.titulo", containsInAnyOrder("Relatório lento", "Erro no login social"));
    }

    @Test
    void filtraPorUrgenciaRepetindoParametro() {
        doProjeto().queryParam("urgencia", "ALTA").queryParam("urgencia", "BAIXA").get("/api/chamados")
                .then().body("itens.titulo", contains("Ajustar layout", "Login quebrado"));
    }

    @Test
    void buscaTextoSemDiferenciarMaiusculas() {
        doProjeto().queryParam("busca", "LOGIN").get("/api/chamados")
                .then().body("itens.titulo", contains("Erro no login social", "Login quebrado"));
    }

    @Test
    void buscaTambemNaDescricao() {
        doProjeto().queryParam("busca", "descrição de documentar").get("/api/chamados")
                .then().body("itens.titulo", contains("Documentar API"));
    }

    @Test
    void combinaFiltros() {
        doProjeto()
                .queryParam("responsavelId", dev.id())
                .queryParam("status", "ABERTO")
                .queryParam("busca", "login")
                .get("/api/chamados")
                .then().body("itens.titulo", contains("Login quebrado"));
    }

    @Test
    void paginaResultados() {
        doProjeto().queryParam("pagina", 1).queryParam("tamanho", 2).get("/api/chamados")
                .then().statusCode(200)
                .body("pagina", equalTo(1))
                .body("tamanho", equalTo(2))
                .body("totalItens", equalTo(5))
                .body("totalPaginas", equalTo(3))
                .body("itens.titulo", contains("Ajustar layout", "Documentar API"));
    }

    @Test
    void tamanhoDePaginaAcimaDoLimiteRetorna400() {
        doProjeto().queryParam("tamanho", 500).get("/api/chamados")
                .then().statusCode(400)
                .body("codigo", equalTo("VALIDACAO"));
    }

    @Test
    void statusInvalidoNoFiltroRetorna400() {
        doProjeto().queryParam("status", "PENDENTE").get("/api/chamados")
                .then().statusCode(400)
                .body("codigo", equalTo("VALIDACAO"));
    }

    private RequestSpecification doProjeto() {
        return como(dev.token()).queryParam("projetoId", projetoId);
    }

    private void alterarStatus(long chamadoId, String status) {
        como(dev.token()).body(Map.of("status", status)).patch("/api/chamados/{id}/status", chamadoId)
                .then().statusCode(200);
    }
}
