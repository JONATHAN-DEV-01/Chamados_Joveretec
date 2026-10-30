package br.com.joveretec.chamados.chamado;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.criarChamado;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.criarProjeto;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

/** A fila do projeto só tem chamados Aberto e Em andamento, numerados 1..n sem buracos. */
@QuarkusTest
class FilaSomenteAtivosTest {

    private UsuarioTeste dev;
    private long projetoId;
    private long a;
    private long b;
    private long c;
    private long d;

    @BeforeEach
    void preparar() {
        dev = criarDesenvolvedor();
        projetoId = criarProjeto();
        a = criarChamado(dev.token(), projetoId, "A", "MEDIA", null);
        b = criarChamado(dev.token(), projetoId, "B", "MEDIA", null);
        c = criarChamado(dev.token(), projetoId, "C", "MEDIA", null);
        d = criarChamado(dev.token(), projetoId, "D", "MEDIA", null);
    }

    @Test
    void concluirTiraDaFilaSemDeixarBuraco() {
        status(b, "CONCLUIDO").body("posicao", nullValue());

        assertEquals(List.of(a, c, d), filaAtiva());
        assertEquals(List.of(1, 2, 3), posicoes(filaAtiva()));
    }

    @Test
    void emAndamentoContinuaNaFilaNaMesmaPosicao() {
        status(c, "EM_ANDAMENTO").body("posicao", equalTo(3));
        assertEquals(List.of(a, b, c, d), filaAtiva());
    }

    @Test
    void reabrirColocaNoFimDaFila() {
        status(a, "CONCLUIDO");
        status(a, "ABERTO").body("posicao", equalTo(4));

        assertEquals(List.of(b, c, d, a), filaAtiva());
        assertEquals(List.of(1, 2, 3, 4), posicoes(filaAtiva()));
    }

    @Test
    void solucaoConcluiETiraDaFila() {
        Map<String, Object> solucao = new HashMap<>();
        solucao.put("texto", "Resolvido");
        solucao.put("tipo", "SOLUCAO");
        solucao.put("concluirChamado", true);
        como(dev.token()).body(solucao).post("/api/chamados/{id}/acompanhamentos", a).then().statusCode(201);

        assertEquals(List.of(b, c, d), filaAtiva());
        assertEquals(List.of(1, 2, 3), posicoes(filaAtiva()));
    }

    @Test
    void naoReordenaChamadoConcluido() {
        status(b, "CONCLUIDO");
        como(dev.token()).body(Map.of("posicao", 1)).put("/api/chamados/{id}/posicao", b)
                .then().statusCode(422)
                .body("codigo", equalTo("REGRA_NEGOCIO"));
    }

    @Test
    void reordenacaoConsideraSoOsAtivos() {
        status(a, "CONCLUIDO");
        // Ativos: B(1) C(2) D(3). Mover D para o topo; o limite agora é 3, não 4.
        como(dev.token()).body(Map.of("posicao", 1)).put("/api/chamados/{id}/posicao", d).then().statusCode(200);
        assertEquals(List.of(d, b, c), filaAtiva());
        como(dev.token()).body(Map.of("posicao", 4)).put("/api/chamados/{id}/posicao", d).then().statusCode(422);
    }

    @Test
    void novoChamadoEntraNoFimDosAtivos() {
        status(a, "CONCLUIDO");
        status(b, "CONCLUIDO");
        long novo = criarChamado(dev.token(), projetoId, "Novo", "MEDIA", null);

        como(dev.token()).get("/api/chamados/{id}", novo).then().body("posicao", equalTo(3));
        assertEquals(List.of(c, d, novo), filaAtiva());
    }

    @Test
    void listaGeralMostraConcluidosPorUltimoDentroDaUrgencia() {
        status(a, "CONCLUIDO");
        como(dev.token()).queryParam("projetoId", projetoId).get("/api/chamados")
                .then().statusCode(200)
                .body("itens.id", contains((int) b, (int) c, (int) d, (int) a));
    }

    private io.restassured.response.ValidatableResponse status(long id, String status) {
        return como(dev.token()).body(Map.of("status", status)).patch("/api/chamados/{id}/status", id)
                .then().statusCode(200);
    }

    private List<Long> filaAtiva() {
        List<Integer> ids = como(dev.token())
                .queryParam("projetoId", projetoId)
                .queryParam("ordem", "POSICAO")
                .queryParam("status", "ABERTO,EM_ANDAMENTO")
                .get("/api/chamados")
                .then().statusCode(200)
                .extract().path("itens.id");
        return ids.stream().map(Integer::longValue).toList();
    }

    private List<Integer> posicoes(List<Long> ids) {
        return ids.stream()
                .map(id -> como(dev.token()).get("/api/chamados/{id}", id).then().extract().<Integer>path("posicao"))
                .toList();
    }
}
