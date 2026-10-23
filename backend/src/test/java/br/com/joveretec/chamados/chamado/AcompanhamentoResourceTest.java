package br.com.joveretec.chamados.chamado;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.comoAdmin;
import static br.com.joveretec.chamados.ApiTeste.criarChamado;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.criarProjeto;
import static br.com.joveretec.chamados.FeedTeste.corpo;
import static br.com.joveretec.chamados.FeedTeste.publicar;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class AcompanhamentoResourceTest {

    private UsuarioTeste autor;
    private UsuarioTeste outroDev;
    private long projetoId;
    private long chamadoId;

    @BeforeEach
    void preparar() {
        autor = criarDesenvolvedor();
        outroDev = criarDesenvolvedor();
        projetoId = criarProjeto();
        chamadoId = criarChamado(autor.token(), projetoId, "Chamado com feed", "MEDIA", null);
    }

    @Test
    void publicaAcompanhamentoComTipoPadraoETempo() {
        como(autor.token()).body(corpo("Investiguei o **log**.\nSegunda linha", null, 30, false, null))
                .post("/api/chamados/{id}/acompanhamentos", chamadoId)
                .then().statusCode(201)
                .body("tipo", equalTo("ACOMPANHAMENTO"))
                .body("texto", equalTo("Investiguei o **log**.\nSegunda linha"))
                .body("tempoGastoMinutos", equalTo(30))
                .body("autor.id", equalTo((int) autor.id()))
                .body("editadoEm", nullValue())
                .body("podeAlterar", equalTo(true));
    }

    @Test
    void validaTextoObrigatorioETempoNaoNegativo() {
        como(autor.token()).body(corpo("  ", null, -5, false, null))
                .post("/api/chamados/{id}/acompanhamentos", chamadoId)
                .then().statusCode(400)
                .body("detalhes.campo", hasItem("texto"))
                .body("detalhes.campo", hasItem("tempoGastoMinutos"));
    }

    @Test
    void autorEditaEFicaMarcadoComoEditado() {
        long id = publicar(autor.token(), chamadoId, "Texto original");
        como(autor.token()).body(corpo("Texto corrigido", "ACOMPANHAMENTO", 15, false, null))
                .put("/api/chamados/{c}/acompanhamentos/{id}", chamadoId, id)
                .then().statusCode(200)
                .body("texto", equalTo("Texto corrigido"))
                .body("editadoEm", notNullValue());
    }

    @Test
    void outroDesenvolvedorNaoEditaNemExclui() {
        long id = publicar(autor.token(), chamadoId, "Do autor");
        como(outroDev.token()).body(corpo("Invasão", null, null, false, null))
                .put("/api/chamados/{c}/acompanhamentos/{id}", chamadoId, id)
                .then().statusCode(403)
                .body("codigo", equalTo("ACESSO_NEGADO"));
        como(outroDev.token()).delete("/api/chamados/{c}/acompanhamentos/{id}", chamadoId, id)
                .then().statusCode(403);
    }

    @Test
    void adminEditaEExcluiQualquerAcompanhamento() {
        long id = publicar(autor.token(), chamadoId, "Do autor");
        comoAdmin().body(corpo("Ajustado pelo admin", null, null, false, null))
                .put("/api/chamados/{c}/acompanhamentos/{id}", chamadoId, id)
                .then().statusCode(200);
        comoAdmin().delete("/api/chamados/{c}/acompanhamentos/{id}", chamadoId, id)
                .then().statusCode(204);
        comoAdmin().delete("/api/chamados/{c}/acompanhamentos/{id}", chamadoId, id)
                .then().statusCode(404);
    }

    @Test
    void autorExcluiOProprio() {
        long id = publicar(autor.token(), chamadoId, "Vou apagar");
        como(autor.token()).delete("/api/chamados/{c}/acompanhamentos/{id}", chamadoId, id)
                .then().statusCode(204);
    }

    @Test
    void acompanhamentoDeOutroChamadoNaoEhEncontrado() {
        long outroChamado = criarChamado(autor.token(), projetoId, "Outro", "BAIXA", null);
        long id = publicar(autor.token(), chamadoId, "Deste chamado");
        como(autor.token()).delete("/api/chamados/{c}/acompanhamentos/{id}", outroChamado, id)
                .then().statusCode(404);
    }

    @Test
    void solucaoConcluiOChamadoNaMesmaAcao() {
        publicar(outroDev.token(), chamadoId, "Corrigido na versão 2.1", "SOLUCAO", 90, true, null);

        como(autor.token()).get("/api/chamados/{id}", chamadoId)
                .then().body("status", equalTo("CONCLUIDO"));
        como(autor.token()).get("/api/chamados/{id}/historico", chamadoId)
                .then().body("itens[0].campo", equalTo("STATUS"))
                .body("itens[0].valorNovo", equalTo("CONCLUIDO"));
    }

    @Test
    void solucaoSemConcluirMantemOStatus() {
        publicar(autor.token(), chamadoId, "Proposta de solução", "SOLUCAO", null, false, null);
        como(autor.token()).get("/api/chamados/{id}", chamadoId).then().body("status", equalTo("ABERTO"));
    }

    @Test
    void soSolucaoPodeConcluirOChamado() {
        como(autor.token()).body(corpo("Andamento", "ACOMPANHAMENTO", null, true, null))
                .post("/api/chamados/{id}/acompanhamentos", chamadoId)
                .then().statusCode(422)
                .body("codigo", equalTo("REGRA_NEGOCIO"));
    }

    @Test
    void tempoGastoTotalAparecerNoDetalheDoChamado() {
        publicar(autor.token(), chamadoId, "Parte 1", null, 30, false, null);
        publicar(outroDev.token(), chamadoId, "Parte 2", null, 45, false, null);
        publicar(outroDev.token(), chamadoId, "Sem tempo");

        como(autor.token()).get("/api/chamados/{id}", chamadoId)
                .then().body("tempoGastoTotalMinutos", equalTo(75));
    }

    @Test
    void acompanhamentoAtualizaAUltimaAtividadeSemMudarAVersao() {
        String antes = como(autor.token()).get("/api/chamados/{id}", chamadoId).then().extract().path("ultimaAtividadeEm");
        publicar(outroDev.token(), chamadoId, "Novidade");

        como(autor.token()).get("/api/chamados/{id}", chamadoId)
                .then().body("versao", equalTo(0))
                .body("ultimaAtividadeEm", org.hamcrest.Matchers.not(equalTo(antes)));
    }

    @Test
    void projetoArquivadoBloqueiaNovosAcompanhamentosEEdicoes() {
        long id = publicar(autor.token(), chamadoId, "Antes de arquivar");
        comoAdmin().post("/api/projetos/{id}/arquivar", projetoId).then().statusCode(200);

        como(autor.token()).body(corpo("Depois", null, null, false, null))
                .post("/api/chamados/{id}/acompanhamentos", chamadoId)
                .then().statusCode(422);
        como(autor.token()).body(corpo("Edição", null, null, false, null))
                .put("/api/chamados/{c}/acompanhamentos/{id}", chamadoId, id)
                .then().statusCode(422);
        como(autor.token()).post("/api/chamados/{id}/acompanhamentos/rascunhos", chamadoId)
                .then().statusCode(422);
        como(autor.token()).body(Map.of("nome", "a.txt", "tipoMime", "text/plain", "tamanhoBytes", 1))
                .post("/api/chamados/{id}/anexos", chamadoId)
                .then().statusCode(422);
    }

    @Test
    void ultimasAtualizacoesDoDashboardMostramChamadosDoUsuario() {
        publicar(outroDev.token(), chamadoId, "Atualização para o autor do chamado");

        como(autor.token()).get("/api/dashboard/ultimas-atualizacoes")
                .then().statusCode(200)
                .body("[0].chamado.id", equalTo((int) chamadoId))
                .body("[0].autor.id", equalTo((int) outroDev.id()))
                .body("[0].resumo", equalTo("Atualização para o autor do chamado"));

        // outroDev não é autor nem responsável do chamado: não recebe a atualização.
        como(outroDev.token()).get("/api/dashboard/ultimas-atualizacoes")
                .then().statusCode(200)
                .body("chamado.id", org.hamcrest.Matchers.not(hasItem((int) chamadoId)));
    }
}
