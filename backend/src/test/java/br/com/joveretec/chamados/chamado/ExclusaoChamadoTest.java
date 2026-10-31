package br.com.joveretec.chamados.chamado;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.comoAdmin;
import static br.com.joveretec.chamados.ApiTeste.criarChamado;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.criarProjeto;
import static br.com.joveretec.chamados.FeedTeste.anexarConcluido;
import static br.com.joveretec.chamados.FeedTeste.publicar;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/** Exclusão lógica de chamado: só admin, some de todas as telas, mas continua no banco. */
@QuarkusTest
class ExclusaoChamadoTest {

    @Inject
    EntityManager entityManager;

    private UsuarioTeste dev;
    private long projetoId;
    private long primeiro;
    private long excluido;
    private long terceiro;

    /** Fila do projeto: primeiro (1), excluido (2), terceiro (3); todos com o dev como responsável. */
    @BeforeEach
    void preparar() {
        dev = criarDesenvolvedor();
        projetoId = criarProjeto();
        primeiro = criarChamado(dev.token(), projetoId, "Primeiro", "MEDIA", dev.id());
        excluido = criarChamado(dev.token(), projetoId, "Vai sumir", "ALTA", dev.id());
        terceiro = criarChamado(dev.token(), projetoId, "Terceiro", "MEDIA", dev.id());
    }

    @Test
    void desenvolvedorNaoPodeExcluir() {
        como(dev.token()).delete("/api/chamados/{id}", excluido).then().statusCode(403);
        como(dev.token()).get("/api/chamados/{id}", excluido).then().statusCode(200);
    }

    @Test
    void someDoDetalheDaListaEDaFilaQueFicaSemBuraco() {
        comoAdmin().delete("/api/chamados/{id}", excluido).then().statusCode(204);

        como(dev.token()).get("/api/chamados/{id}", excluido).then().statusCode(404);
        comoAdmin().get("/api/chamados/{id}", excluido).then().statusCode(404);
        como(dev.token()).get("/api/chamados/{id}/feed", excluido).then().statusCode(404);
        como(dev.token()).get("/api/chamados/{id}/historico", excluido).then().statusCode(404);
        como(dev.token()).queryParam("projetoId", projetoId).get("/api/chamados")
                .then().body("itens.id", not(hasItem((int) excluido))).body("totalItens", equalTo(2));
        como(dev.token()).queryParam("projetoId", projetoId).queryParam("ordem", "POSICAO").get("/api/chamados")
                .then().body("itens.id", contains((int) primeiro, (int) terceiro))
                .body("itens.posicao", contains(1, 2));
    }

    @Test
    void someDoDashboardInclusiveMeusChamadosETempos() {
        publicar(dev.token(), excluido, "Atualização do chamado que vai sumir");
        comoAdmin().delete("/api/chamados/{id}", excluido).then().statusCode(204);

        como(dev.token()).queryParam("projetoId", projetoId).get("/api/dashboard/por-status")
                .then().body("find { it.status == 'ABERTO' }.total", equalTo(2));
        como(dev.token()).queryParam("projetoId", projetoId).get("/api/dashboard/meus-chamados")
                .then().body("total", equalTo(2));
        como(dev.token()).queryParam("projetoId", projetoId).get("/api/dashboard/por-desenvolvedor")
                .then().body("find { it.usuario.id == " + dev.id() + " }.total", equalTo(2));
        como(dev.token()).queryParam("projetoId", projetoId).get("/api/dashboard/tempos")
                .then().body("abertosHaMaisTempo.chamado.id", not(hasItem((int) excluido)));
        como(dev.token()).get("/api/dashboard/ultimas-atualizacoes")
                .then().body("chamado.id", not(hasItem((int) excluido)));
    }

    @Test
    void naoAceitaMaisAcompanhamentosNemEntregaAnexos() {
        long anexoId = anexarConcluido(dev.token(), excluido, "log.txt", "abc", null);
        comoAdmin().delete("/api/chamados/{id}", excluido).then().statusCode(204);

        como(dev.token()).body(Map.of("texto", "Ainda aqui?", "tipo", "ACOMPANHAMENTO"))
                .post("/api/chamados/{id}/acompanhamentos", excluido).then().statusCode(404);
        como(dev.token()).get("/api/anexos/{id}/download", anexoId).then().statusCode(404);
        como(dev.token()).queryParam("ids", anexoId).get("/api/anexos/links").then().body("size()", equalTo(0));
        como(dev.token()).body(Map.of("status", "CONCLUIDO")).patch("/api/chamados/{id}/status", excluido)
                .then().statusCode(404);
    }

    @Test
    void continuaNoBancoComQuemExcluiuEQuando() {
        comoAdmin().delete("/api/chamados/{id}", excluido).then().statusCode(204);

        Object[] linha = QuarkusTransaction.requiringNew().call(() -> (Object[]) entityManager.createNativeQuery(
                        "select titulo, excluido_em, excluido_por_id, posicao from chamado where id = :id")
                .setParameter("id", excluido).getSingleResult());
        assertEquals("Vai sumir", linha[0]);
        assertNotNull(linha[1]);
        assertNotNull(linha[2]);
        assertEquals(null, linha[3]);
    }

    @Test
    void excluirDeNovoOuInexistenteDa404() {
        comoAdmin().delete("/api/chamados/{id}", excluido).then().statusCode(204);
        comoAdmin().delete("/api/chamados/{id}", excluido).then().statusCode(404);
        comoAdmin().delete("/api/chamados/{id}", 999_999_999).then().statusCode(404);
    }

    @Test
    void concluidoTambemPodeSerExcluidoSemMexerNaFila() {
        como(dev.token()).body(Map.of("status", "CONCLUIDO")).patch("/api/chamados/{id}/status", primeiro)
                .then().statusCode(200);
        comoAdmin().delete("/api/chamados/{id}", primeiro).then().statusCode(204);

        como(dev.token()).queryParam("projetoId", projetoId).queryParam("ordem", "POSICAO").get("/api/chamados")
                .then().body("itens.id", contains((int) excluido, (int) terceiro))
                .body("itens.posicao", contains(1, 2));
    }

    @Test
    void projetoArquivadoNaoPermiteExcluir() {
        comoAdmin().post("/api/projetos/{id}/arquivar", projetoId).then().statusCode(200);
        comoAdmin().delete("/api/chamados/{id}", excluido).then().statusCode(422);
    }
}
