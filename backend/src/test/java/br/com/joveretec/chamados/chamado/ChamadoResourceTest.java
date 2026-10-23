package br.com.joveretec.chamados.chamado;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.comoAdmin;
import static br.com.joveretec.chamados.ApiTeste.criarChamado;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.criarProjeto;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
class ChamadoResourceTest {

    private UsuarioTeste dev;
    private UsuarioTeste outroDev;
    private long projetoId;

    @BeforeEach
    void preparar() {
        dev = criarDesenvolvedor();
        outroDev = criarDesenvolvedor();
        projetoId = criarProjeto();
    }

    @Test
    void criaChamadoNoFimDaFilaComHistoricoDeCriacao() {
        criarChamado(dev.token(), projetoId, "Primeiro", "BAIXA", null);
        long id = criarChamado(dev.token(), projetoId, "Segundo", "ALTA", null);

        como(dev.token()).get("/api/chamados/{id}", id)
                .then().statusCode(200)
                .body("posicao", equalTo(2))
                .body("status", equalTo("ABERTO"))
                .body("responsavel", nullValue())
                .body("criadoPor.id", equalTo((int) dev.id()))
                .body("projeto.id", equalTo((int) projetoId))
                .body("versao", equalTo(0));

        como(dev.token()).get("/api/chamados/{id}/historico", id)
                .then().statusCode(200)
                .body("totalItens", equalTo(1))
                .body("itens[0].campo", equalTo("CRIACAO"))
                .body("itens[0].usuario.id", equalTo((int) dev.id()));
    }

    @Test
    void criaChamadoEmPosicaoInformadaDeslocandoOsDemais() {
        long a = criarChamado(dev.token(), projetoId, "A", "MEDIA", null);
        long b = criarChamado(dev.token(), projetoId, "B", "MEDIA", null);

        Integer c = como(dev.token())
                .body(corpoChamado("C", "MEDIA", null, 1))
                .post("/api/chamados")
                .then().statusCode(201)
                .body("posicao", equalTo(1))
                .extract().path("id");

        assertEquals(List.of(c.longValue(), a, b), idsNaFila());
    }

    @Test
    void criacaoValidaCamposObrigatorios() {
        como(dev.token())
                .body(Map.of("titulo", "", "urgencia", "BAIXA"))
                .post("/api/chamados")
                .then().statusCode(400)
                .body("codigo", equalTo("VALIDACAO"))
                .body("detalhes.campo", hasItems("projetoId", "titulo", "descricao"));
    }

    @Test
    void urgenciaInvalidaRetorna400() {
        Map<String, Object> corpo = corpoChamado("X", "URGENTISSIMA", null, null);
        como(dev.token()).body(corpo).post("/api/chamados")
                .then().statusCode(400)
                .body("codigo", equalTo("VALIDACAO"))
                .body("detalhes[0].campo", equalTo("urgencia"));
    }

    @Test
    void jsonMalformadoRetorna400() {
        como(dev.token()).body("{ isto não é json").post("/api/chamados")
                .then().statusCode(400)
                .body("codigo", equalTo("VALIDACAO"));
    }

    @Test
    void posicaoForaDaFilaRetorna422() {
        criarChamado(dev.token(), projetoId, "A", "BAIXA", null);
        como(dev.token()).body(corpoChamado("Longe", "BAIXA", null, 5)).post("/api/chamados")
                .then().statusCode(422)
                .body("codigo", equalTo("REGRA_NEGOCIO"));
    }

    @Test
    void atribuiAOutroDesenvolvedorEAutoatribui() {
        long id = criarChamado(dev.token(), projetoId, "Para outro", "ALTA", outroDev.id());
        como(dev.token()).get("/api/chamados/{id}", id)
                .then().body("responsavel.id", equalTo((int) outroDev.id()));

        long proprio = criarChamado(dev.token(), projetoId, "Para mim", "ALTA", dev.id());
        como(dev.token()).get("/api/chamados/{id}", proprio)
                .then().body("responsavel.id", equalTo((int) dev.id()));
    }

    @Test
    void atribuirAMimRegistraHistorico() {
        long id = criarChamado(dev.token(), projetoId, "Sem dono", "MEDIA", outroDev.id());

        como(dev.token()).post("/api/chamados/{id}/atribuir-a-mim", id)
                .then().statusCode(200)
                .body("responsavel.id", equalTo((int) dev.id()));

        como(dev.token()).get("/api/chamados/{id}/historico", id)
                .then().statusCode(200)
                .body("itens[0].campo", equalTo("RESPONSAVEL"))
                .body("itens[0].valorAnterior", equalTo(outroDev.nome()))
                .body("itens[0].valorNovo", equalTo(dev.nome()));
    }

    @Test
    void naoAtribuiAUsuarioDesativado() {
        comoAdmin().post("/api/usuarios/{id}/desativar", outroDev.id()).then().statusCode(200);
        como(dev.token()).body(corpoChamado("X", "BAIXA", outroDev.id(), null)).post("/api/chamados")
                .then().statusCode(422);
    }

    @Test
    void alteraStatus() {
        long id = criarChamado(dev.token(), projetoId, "Status", "BAIXA", null);
        como(dev.token()).body(Map.of("status", "EM_ANDAMENTO")).patch("/api/chamados/{id}/status", id)
                .then().statusCode(200).body("status", equalTo("EM_ANDAMENTO"));
        como(dev.token()).body(Map.of("status", "CONCLUIDO")).patch("/api/chamados/{id}/status", id)
                .then().statusCode(200).body("status", equalTo("CONCLUIDO"));

        como(dev.token()).get("/api/chamados/{id}/historico", id)
                .then().body("itens.campo", contains("STATUS", "STATUS", "CRIACAO"))
                .body("itens[0].valorNovo", equalTo("CONCLUIDO"));
    }

    @Test
    void editaChamadoRegistrandoSomenteCamposAlterados() {
        long id = criarChamado(dev.token(), projetoId, "Original", "BAIXA", null);
        Map<String, Object> edicao = new HashMap<>();
        edicao.put("titulo", "Novo título");
        edicao.put("descricao", "Descrição de Original");
        edicao.put("urgencia", "CRITICA");
        edicao.put("responsavelId", outroDev.id());
        edicao.put("versao", 0);

        como(dev.token()).body(edicao).put("/api/chamados/{id}", id)
                .then().statusCode(200)
                .body("titulo", equalTo("Novo título"))
                .body("urgencia", equalTo("CRITICA"))
                .body("responsavel.id", equalTo((int) outroDev.id()))
                .body("versao", equalTo(1));

        como(dev.token()).get("/api/chamados/{id}/historico", id)
                .then().body("totalItens", equalTo(4))
                .body("itens.campo", hasItems("TITULO", "URGENCIA", "RESPONSAVEL", "CRIACAO"));
    }

    @Test
    void edicaoComVersaoDesatualizadaRetorna409() {
        long id = criarChamado(dev.token(), projetoId, "Concorrente", "BAIXA", null);
        Map<String, Object> edicao = Map.of("titulo", "Primeira edição", "descricao", "D",
                "urgencia", "BAIXA", "versao", 0);
        como(dev.token()).body(edicao).put("/api/chamados/{id}", id).then().statusCode(200);

        como(outroDev.token()).body(edicao).put("/api/chamados/{id}", id)
                .then().statusCode(409)
                .body("codigo", equalTo("CONFLITO"));
    }

    @Test
    void reordenaParaCimaEParaBaixo() {
        long a = criarChamado(dev.token(), projetoId, "A", "BAIXA", null);
        long b = criarChamado(dev.token(), projetoId, "B", "BAIXA", null);
        long c = criarChamado(dev.token(), projetoId, "C", "BAIXA", null);
        long d = criarChamado(dev.token(), projetoId, "D", "BAIXA", null);

        como(dev.token()).body(Map.of("posicao", 1)).put("/api/chamados/{id}/posicao", c)
                .then().statusCode(200).body("posicao", equalTo(1));
        assertEquals(List.of(c, a, b, d), idsNaFila());

        como(dev.token()).body(Map.of("posicao", 4)).put("/api/chamados/{id}/posicao", c)
                .then().statusCode(200).body("posicao", equalTo(4));
        assertEquals(List.of(a, b, d, c), idsNaFila());

        como(dev.token()).get("/api/chamados/{id}/historico", c)
                .then().body("itens[0].campo", equalTo("POSICAO"))
                .body("itens[0].valorAnterior", equalTo("1"))
                .body("itens[0].valorNovo", equalTo("4"));
    }

    @Test
    void reordenarForaDosLimitesRetorna422() {
        long a = criarChamado(dev.token(), projetoId, "A", "BAIXA", null);
        criarChamado(dev.token(), projetoId, "B", "BAIXA", null);

        como(dev.token()).body(Map.of("posicao", 3)).put("/api/chamados/{id}/posicao", a)
                .then().statusCode(422);
        como(dev.token()).body(Map.of("posicao", 0)).put("/api/chamados/{id}/posicao", a)
                .then().statusCode(400);
    }

    @Test
    void projetoArquivadoNaoAceitaNovosChamados() {
        comoAdmin().post("/api/projetos/{id}/arquivar", projetoId).then().statusCode(200);
        como(dev.token()).body(corpoChamado("X", "BAIXA", null, null)).post("/api/chamados")
                .then().statusCode(422)
                .body("codigo", equalTo("REGRA_NEGOCIO"));
    }

    @Test
    void chamadoInexistenteRetorna404() {
        como(dev.token()).get("/api/chamados/{id}", 999_999)
                .then().statusCode(404)
                .body("codigo", equalTo("NAO_ENCONTRADO"));
    }

    private Map<String, Object> corpoChamado(String titulo, String urgencia, Long responsavelId, Integer posicao) {
        Map<String, Object> corpo = new HashMap<>();
        corpo.put("projetoId", projetoId);
        corpo.put("titulo", titulo);
        corpo.put("descricao", "Descrição de " + titulo);
        corpo.put("urgencia", urgencia);
        corpo.put("responsavelId", responsavelId);
        corpo.put("posicao", posicao);
        return corpo;
    }

    /** Ids do projeto em ordem de posição (todos os chamados de teste usam a mesma urgência). */
    private List<Long> idsNaFila() {
        List<Integer> ids = como(dev.token())
                .queryParam("projetoId", projetoId)
                .get("/api/chamados")
                .then().statusCode(200)
                .extract().path("itens.id");
        return ids.stream().map(Integer::longValue).toList();
    }
}
