package br.com.joveretec.chamados.chamado;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.LongStream;

import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.comoAdmin;
import static br.com.joveretec.chamados.ApiTeste.criarChamado;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.criarProjeto;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

/** Vários responsáveis por chamado: criação, edição, filtros, histórico e dashboard. */
@QuarkusTest
class ResponsaveisChamadoTest {

    private UsuarioTeste dev;
    private UsuarioTeste outroDev;
    private UsuarioTeste terceiroDev;
    private long projetoId;

    @BeforeEach
    void preparar() {
        dev = criarDesenvolvedor();
        outroDev = criarDesenvolvedor();
        terceiroDev = criarDesenvolvedor();
        projetoId = criarProjeto();
    }

    @Test
    void criaComVariosResponsaveisSemRepetir() {
        long id = criar("Dois donos", List.of(dev.id(), outroDev.id(), dev.id()));

        como(dev.token()).get("/api/chamados/{id}", id)
                .then().statusCode(200)
                .body("responsaveis.id", containsInAnyOrder((int) dev.id(), (int) outroDev.id()))
                .body("responsaveis.size()", equalTo(2));
    }

    @Test
    void semResponsavelDevolveListaVazia() {
        long id = criar("Ninguém", List.of());

        como(dev.token()).get("/api/chamados/{id}", id)
                .then().statusCode(200)
                .body("responsaveis", empty())
                .body("responsavel", nullValue());
    }

    @Test
    void aceitaOCampoResponsavelIdDaVersaoAnterior() {
        long id = criarChamado(dev.token(), projetoId, "Cliente antigo", "MEDIA", outroDev.id());

        como(dev.token()).get("/api/chamados/{id}", id)
                .then().body("responsaveis.id", contains((int) outroDev.id()))
                .body("responsavel.id", equalTo((int) outroDev.id()));
    }

    @Test
    void edicaoRegistraQuemEntrouEQuemSaiu() {
        long id = criar("Troca", List.of(dev.id(), outroDev.id()));

        como(dev.token()).body(edicao(List.of(outroDev.id(), terceiroDev.id()), 0)).put("/api/chamados/{id}", id)
                .then().statusCode(200)
                .body("responsaveis.id", containsInAnyOrder((int) outroDev.id(), (int) terceiroDev.id()))
                .body("versao", equalTo(1));

        como(dev.token()).get("/api/chamados/{id}/historico", id)
                .then().statusCode(200)
                .body("itens.findAll { it.campo == 'RESPONSAVEL_REMOVIDO' }.valorAnterior", contains(dev.nome()))
                .body("itens.findAll { it.campo == 'RESPONSAVEL_ADICIONADO' }.valorNovo", contains(terceiroDev.nome()));
    }

    @Test
    void edicaoSemMudarResponsaveisNaoGeraHistorico() {
        long id = criar("Igual", List.of(dev.id(), outroDev.id()));

        como(dev.token()).body(edicao(List.of(outroDev.id(), dev.id()), 0)).put("/api/chamados/{id}", id)
                .then().statusCode(200);

        como(dev.token()).get("/api/chamados/{id}/historico", id)
                .then().body("itens.campo", not(hasItem("RESPONSAVEL_ADICIONADO")))
                .body("itens.campo", not(hasItem("RESPONSAVEL_REMOVIDO")));
    }

    @Test
    void atribuirAMimQuandoJaEraResponsavelNaoAlteraNada() {
        long id = criar("Já é meu", List.of(dev.id()));

        como(dev.token()).post("/api/chamados/{id}/atribuir-a-mim", id)
                .then().statusCode(200)
                .body("responsaveis.id", contains((int) dev.id()))
                .body("versao", equalTo(0));
    }

    @Test
    void responsavelDesativadoContinuaNaEdicaoMasNaoPodeEntrar() {
        long id = criar("Com inativo", List.of(dev.id(), outroDev.id()));
        comoAdmin().post("/api/usuarios/{id}/desativar", outroDev.id()).then().statusCode(200);

        como(dev.token()).body(edicao(List.of(dev.id(), outroDev.id()), 0)).put("/api/chamados/{id}", id)
                .then().statusCode(200);

        long outro = criar("Novo", List.of());
        como(dev.token()).body(edicao(List.of(outroDev.id()), 0)).put("/api/chamados/{id}", outro)
                .then().statusCode(422)
                .body("codigo", equalTo("REGRA_NEGOCIO"));
    }

    @Test
    void limitaQuantidadeDeResponsaveis() {
        Map<String, Object> corpo = corpo("Muitos", LongStream.rangeClosed(1, 21).boxed().toList());
        como(dev.token()).body(corpo).post("/api/chamados")
                .then().statusCode(400)
                .body("codigo", equalTo("VALIDACAO"));
    }

    @Test
    void filtroPorResponsavelEncontraChamadoCompartilhado() {
        long compartilhado = criar("Compartilhado", List.of(dev.id(), outroDev.id()));
        long soDoOutro = criar("Só do outro", List.of(outroDev.id()));
        long semNinguem = criar("Sem ninguém", List.of());

        como(dev.token()).queryParam("projetoId", projetoId).queryParam("responsavelId", dev.id())
                .get("/api/chamados")
                .then().body("itens.id", contains((int) compartilhado));

        como(dev.token()).queryParam("projetoId", projetoId).queryParam("responsavelId", outroDev.id())
                .get("/api/chamados")
                .then().body("itens.id", containsInAnyOrder((int) compartilhado, (int) soDoOutro))
                .body("totalItens", equalTo(2));

        como(dev.token()).queryParam("projetoId", projetoId).queryParam("semResponsavel", true)
                .get("/api/chamados")
                .then().body("itens.id", contains((int) semNinguem));
    }

    @Test
    void dashboardContaOChamadoParaCadaResponsavel() {
        criar("Compartilhado", List.of(dev.id(), outroDev.id()));

        como(dev.token()).queryParam("projetoId", projetoId).get("/api/dashboard/por-desenvolvedor")
                .then().statusCode(200)
                .body("usuario.id", containsInAnyOrder((int) dev.id(), (int) outroDev.id()))
                .body("abertos", contains(1, 1));

        como(outroDev.token()).queryParam("projetoId", projetoId).get("/api/dashboard/meus-chamados")
                .then().body("total", equalTo(1));
    }

    @Test
    void ultimasAtualizacoesIncluemChamadoEmQueSouUmDosResponsaveis() {
        long id = criar("Com novidade", List.of(dev.id(), outroDev.id()));
        como(dev.token()).body(Map.of("texto", "Andamento do compartilhado"))
                .post("/api/chamados/{id}/acompanhamentos", id)
                .then().statusCode(201);

        como(outroDev.token()).get("/api/dashboard/ultimas-atualizacoes")
                .then().statusCode(200)
                .body("chamado.id", hasItem((int) id));
        como(terceiroDev.token()).get("/api/dashboard/ultimas-atualizacoes")
                .then().body("chamado.id", not(hasItem((int) id)));
    }

    private long criar(String titulo, List<Long> responsavelIds) {
        Integer id = como(dev.token()).body(corpo(titulo, responsavelIds)).post("/api/chamados")
                .then().statusCode(201)
                .extract().path("id");
        return id.longValue();
    }

    private Map<String, Object> corpo(String titulo, List<Long> responsavelIds) {
        Map<String, Object> corpo = new HashMap<>();
        corpo.put("projetoId", projetoId);
        corpo.put("titulo", titulo);
        corpo.put("descricao", "Descrição de " + titulo);
        corpo.put("urgencia", "MEDIA");
        corpo.put("responsavelIds", responsavelIds);
        return corpo;
    }

    private static Map<String, Object> edicao(List<Long> responsavelIds, long versao) {
        Map<String, Object> corpo = new HashMap<>();
        corpo.put("titulo", "Título");
        corpo.put("descricao", "Descrição");
        corpo.put("urgencia", "MEDIA");
        corpo.put("responsavelIds", responsavelIds);
        corpo.put("versao", versao);
        return corpo;
    }
}
