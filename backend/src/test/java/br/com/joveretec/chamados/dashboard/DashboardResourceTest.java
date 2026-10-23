package br.com.joveretec.chamados.dashboard;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.criarChamado;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.criarProjeto;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;

@QuarkusTest
class DashboardResourceTest {

    private UsuarioTeste dev;
    private UsuarioTeste outroDev;
    private long projetoId;

    /*
     * Projeto com 4 chamados:
     * dev:      ALTA (ABERTO), CRITICA (CONCLUIDO), BAIXA (EM_ANDAMENTO)
     * outroDev: ALTA (ABERTO)
     * + 1 chamado sem responsável, MEDIA (ABERTO)
     */
    @BeforeEach
    void preparar() {
        dev = criarDesenvolvedor();
        outroDev = criarDesenvolvedor();
        projetoId = criarProjeto();
        criarChamado(dev.token(), projetoId, "A", "ALTA", dev.id());
        long concluido = criarChamado(dev.token(), projetoId, "B", "CRITICA", dev.id());
        long andamento = criarChamado(dev.token(), projetoId, "C", "BAIXA", dev.id());
        criarChamado(dev.token(), projetoId, "D", "ALTA", outroDev.id());
        criarChamado(dev.token(), projetoId, "E", "MEDIA", null);
        alterarStatus(concluido, "CONCLUIDO");
        alterarStatus(andamento, "EM_ANDAMENTO");
    }

    @Test
    void totaisPorStatusIncluemTodosOsStatus() {
        como(dev.token()).queryParam("projetoId", projetoId).get("/api/dashboard/por-status")
                .then().statusCode(200)
                .body("$", hasSize(3))
                .body("find { it.status == 'ABERTO' }.total", equalTo(3))
                .body("find { it.status == 'EM_ANDAMENTO' }.total", equalTo(1))
                .body("find { it.status == 'CONCLUIDO' }.total", equalTo(1));
    }

    @Test
    void totaisPorUrgencia() {
        como(dev.token()).queryParam("projetoId", projetoId).get("/api/dashboard/por-urgencia")
                .then().statusCode(200)
                .body("$", hasSize(4))
                .body("find { it.urgencia == 'CRITICA' }.total", equalTo(1))
                .body("find { it.urgencia == 'ALTA' }.total", equalTo(2))
                .body("find { it.urgencia == 'MEDIA' }.total", equalTo(1))
                .body("find { it.urgencia == 'BAIXA' }.total", equalTo(1));
    }

    @Test
    void totaisPorDesenvolvedor() {
        String devFiltro = "find { it.usuario.id == " + dev.id() + " }";
        String outroFiltro = "find { it.usuario.id == " + outroDev.id() + " }";
        como(dev.token()).queryParam("projetoId", projetoId).get("/api/dashboard/por-desenvolvedor")
                .then().statusCode(200)
                .body("$", hasSize(2))
                .body(devFiltro + ".usuario.nome", equalTo(dev.nome()))
                .body(devFiltro + ".abertos", equalTo(1))
                .body(devFiltro + ".emAndamento", equalTo(1))
                .body(devFiltro + ".concluidos", equalTo(1))
                .body(devFiltro + ".total", equalTo(3))
                .body(outroFiltro + ".abertos", equalTo(1))
                .body(outroFiltro + ".total", equalTo(1));
    }

    @Test
    void meusChamadosConsideraSomenteOUsuarioLogado() {
        como(dev.token()).get("/api/dashboard/meus-chamados")
                .then().statusCode(200)
                .body("total", equalTo(3))
                .body("porStatus.find { it.status == 'ABERTO' }.total", equalTo(1))
                .body("porUrgencia.find { it.urgencia == 'ALTA' }.total", equalTo(1))
                .body("porUrgencia.find { it.urgencia == 'MEDIA' }.total", equalTo(0));

        como(outroDev.token()).get("/api/dashboard/meus-chamados")
                .then().statusCode(200)
                .body("total", equalTo(1));
    }

    private void alterarStatus(long chamadoId, String status) {
        como(dev.token()).body(Map.of("status", status)).patch("/api/chamados/{id}/status", chamadoId)
                .then().statusCode(200);
    }
}
