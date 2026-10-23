package br.com.joveretec.chamados.chamado;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import br.com.joveretec.chamados.chamado.control.AnexoService;
import br.com.joveretec.chamados.chamado.entity.AnexoRepository;
import br.com.joveretec.chamados.comum.armazenamento.LocalArmazenamento;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import io.restassured.response.Response;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.comoAdmin;
import static br.com.joveretec.chamados.ApiTeste.criarChamado;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.criarProjeto;
import static br.com.joveretec.chamados.FeedTeste.anexarConcluido;
import static br.com.joveretec.chamados.FeedTeste.criarRascunho;
import static br.com.joveretec.chamados.FeedTeste.enviar;
import static br.com.joveretec.chamados.FeedTeste.feed;
import static br.com.joveretec.chamados.FeedTeste.publicar;
import static br.com.joveretec.chamados.FeedTeste.solicitarEnvio;
import static br.com.joveretec.chamados.FeedTeste.corpo;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class AnexoFluxoTest {

    @Inject
    AnexoRepository anexos;

    @Inject
    LocalArmazenamento armazenamento;

    @Inject
    AnexoService servico;

    @Inject
    EntityManager entityManager;

    private UsuarioTeste autor;
    private UsuarioTeste outroDev;
    private long projetoId;
    private long chamadoId;

    @BeforeEach
    void preparar() {
        autor = criarDesenvolvedor();
        outroDev = criarDesenvolvedor();
        projetoId = criarProjeto();
        chamadoId = criarChamado(autor.token(), projetoId, "Com anexos", "ALTA", null);
    }

    @Test
    void fluxoCompletoNaAberturaSolicitarEnviarConfirmarBaixarExcluir() {
        JsonPath autorizacao = solicitarEnvio(autor.token(), chamadoId, "Relatório Final (v2).txt", "text/plain", 999, null);
        long anexoId = autorizacao.getLong("anexo.id");
        assertEquals("PENDENTE", autorizacao.getString("anexo.status"));
        assertEquals("PUT", autorizacao.getString("envio.protocolo"));
        assertEquals("projetos/" + projetoId + "/chamados/" + chamadoId + "/abertura/" + anexoId
                + "-Relatorio-Final-v2.txt", caminho(anexoId));

        enviar(autorizacao, "conteúdo do relatório");
        como(autor.token()).post("/api/anexos/{id}/confirmar", anexoId)
                .then().statusCode(200)
                .body("status", equalTo("CONCLUIDO"))
                .body("nome", equalTo("Relatório Final (v2).txt"))
                // O tamanho real vem do armazenamento, não do informado pelo navegador.
                .body("tamanhoBytes", equalTo("conteúdo do relatório".getBytes(java.nio.charset.StandardCharsets.UTF_8).length));

        JsonPath feed = feed(autor.token(), chamadoId, "ASC");
        assertEquals(anexoId, feed.getLong("itens[0].abertura.anexos[0].id"));
        assertEquals("ANEXO_ADICIONADO", feed.getString("itens[1].evento.campo"));

        String url = como(outroDev.token()).get("/api/anexos/{id}/download", anexoId)
                .then().statusCode(200).extract().path("url");
        Response download = given().urlEncodingEnabled(false).get(url);
        assertEquals(200, download.statusCode());
        assertEquals("conteúdo do relatório", download.asString());
        assertTrue(download.header("Content-Disposition").startsWith("attachment"));

        como(autor.token()).delete("/api/anexos/{id}", anexoId).then().statusCode(204);
        assertTrue(armazenamento.tamanho(caminho0(projetoId, chamadoId, anexoId)).isEmpty());
        JsonPath depois = feed(autor.token(), chamadoId, "ASC");
        assertEquals("ANEXO_REMOVIDO", depois.getString("itens[2].evento.campo"));
        assertEquals("Relatório Final (v2).txt", depois.getString("itens[2].evento.valorAnterior"));
    }

    @Test
    void confirmarSemEnviarRetorna422() {
        long anexoId = solicitarEnvio(autor.token(), chamadoId, "a.txt", "text/plain", 10, null).getLong("anexo.id");
        como(autor.token()).post("/api/anexos/{id}/confirmar", anexoId)
                .then().statusCode(422)
                .body("mensagem", containsString("ainda não chegou"));
    }

    @Test
    void anexoPendenteNaoPodeSerBaixado() {
        long anexoId = solicitarEnvio(autor.token(), chamadoId, "a.txt", "text/plain", 10, null).getLong("anexo.id");
        como(autor.token()).get("/api/anexos/{id}/download", anexoId).then().statusCode(404);
    }

    @Test
    void soQuemEnviouOuAdminExcluiOAnexo() {
        long anexoId = anexarConcluido(autor.token(), chamadoId, "a.txt", "abc", null);
        como(outroDev.token()).delete("/api/anexos/{id}", anexoId).then().statusCode(403);
        comoAdmin().delete("/api/anexos/{id}", anexoId).then().statusCode(204);
    }

    @Test
    void soOAutorDoChamadoOuAdminAnexaNaAbertura() {
        como(outroDev.token()).body(Map.of("nome", "a.txt", "tipoMime", "text/plain", "tamanhoBytes", 1))
                .post("/api/chamados/{id}/anexos", chamadoId)
                .then().statusCode(403);
        comoAdmin().body(Map.of("nome", "a.txt", "tipoMime", "text/plain", "tamanhoBytes", 1))
                .post("/api/chamados/{id}/anexos", chamadoId)
                .then().statusCode(201);
    }

    @Test
    void linkDeDownloadAdulteradoEhRecusado() {
        long anexoId = anexarConcluido(autor.token(), chamadoId, "a.txt", "abc", null);
        String url = como(autor.token()).get("/api/anexos/{id}/download", anexoId).then().extract().path("url");
        String adulterada = url.replaceFirst("/api/armazenamento-local/.", "/api/armazenamento-local/X");
        given().urlEncodingEnabled(false).get(adulterada).then().statusCode(403);
    }

    @Test
    void acompanhamentoSoEhPublicadoDepoisDosEnviosEMostraOsAnexos() {
        long rascunho = criarRascunho(autor.token(), chamadoId);
        JsonPath autorizacao = solicitarEnvio(autor.token(), chamadoId, "print da tela.png", "image/png", 3, rascunho);
        long anexoId = autorizacao.getLong("anexo.id");
        assertEquals("projetos/" + projetoId + "/chamados/" + chamadoId + "/acompanhamentos/" + rascunho + "/"
                + anexoId + "-print-da-tela.png", caminho(anexoId));

        // Envio ainda pendente: não publica.
        como(autor.token()).body(corpo("Segue o print", null, null, false, rascunho))
                .post("/api/chamados/{id}/acompanhamentos", chamadoId)
                .then().statusCode(422);

        enviar(autorizacao, "png");
        como(autor.token()).post("/api/anexos/{id}/confirmar", anexoId).then().statusCode(200);
        long publicado = publicar(autor.token(), chamadoId, "Segue o print", null, null, false, rascunho);
        assertEquals(rascunho, publicado);

        JsonPath feed = feed(autor.token(), chamadoId, "ASC");
        assertEquals(List.of("ABERTURA", "ACOMPANHAMENTO"), feed.getList("itens.tipo"));
        assertEquals("print da tela.png", feed.getString("itens[1].acompanhamento.anexos[0].nome"));
    }

    @Test
    void naoSeAnexaAoRascunhoDeOutraPessoa() {
        long rascunho = criarRascunho(autor.token(), chamadoId);
        como(outroDev.token())
                .body(Map.of("nome", "a.txt", "tipoMime", "text/plain", "tamanhoBytes", 1, "acompanhamentoId", rascunho))
                .post("/api/chamados/{id}/anexos", chamadoId)
                .then().statusCode(422);
    }

    @Test
    void excluirAcompanhamentoExcluiOsAnexosNoBancoENoArmazenamento() {
        long rascunho = criarRascunho(autor.token(), chamadoId);
        long anexoId = anexarConcluido(autor.token(), chamadoId, "log.txt", "linhas de log", rascunho);
        String caminho = caminho(anexoId);
        publicar(autor.token(), chamadoId, "Com log", null, null, false, rascunho);
        assertTrue(armazenamento.tamanho(caminho).isPresent());

        como(autor.token()).delete("/api/chamados/{c}/acompanhamentos/{id}", chamadoId, rascunho)
                .then().statusCode(204);

        assertTrue(anexos.findByIdOptional(anexoId).isEmpty());
        assertTrue(armazenamento.tamanho(caminho).isEmpty());
    }

    @Test
    void limpezaRemovePendentesERascunhosAntigos() {
        long pendenteAntigo = solicitarEnvio(autor.token(), chamadoId, "velho.txt", "text/plain", 5, null).getLong("anexo.id");
        long pendenteNovo = solicitarEnvio(autor.token(), chamadoId, "novo.txt", "text/plain", 5, null).getLong("anexo.id");
        long rascunhoAntigo = criarRascunho(autor.token(), chamadoId);
        long anexoDoRascunho = anexarConcluido(autor.token(), chamadoId, "r.txt", "abc", rascunhoAntigo);
        String caminhoDoRascunho = caminho(anexoDoRascunho);

        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("update anexo set criado_em = now() - interval '25 hours' where id = :id")
                    .setParameter("id", pendenteAntigo).executeUpdate();
            entityManager.createNativeQuery(
                            "update acompanhamento set criado_em = now() - interval '25 hours' where id = :id")
                    .setParameter("id", rascunhoAntigo).executeUpdate();
        });

        assertTrue(servico.limparPendentes() >= 2);

        assertTrue(anexos.findByIdOptional(pendenteAntigo).isEmpty());
        assertTrue(anexos.findByIdOptional(anexoDoRascunho).isEmpty());
        assertTrue(armazenamento.tamanho(caminhoDoRascunho).isEmpty());
        assertTrue(anexos.findByIdOptional(pendenteNovo).isPresent());
        como(autor.token()).body(corpo("x", null, null, false, rascunhoAntigo))
                .post("/api/chamados/{id}/acompanhamentos", chamadoId)
                .then().statusCode(404);
    }

    private String caminho(long anexoId) {
        return QuarkusTransaction.requiringNew().call(() -> anexos.findById(anexoId).getCaminho());
    }

    private static String caminho0(long projetoId, long chamadoId, long anexoId) {
        return "projetos/" + projetoId + "/chamados/" + chamadoId + "/abertura/" + anexoId + "-Relatorio-Final-v2.txt";
    }
}
