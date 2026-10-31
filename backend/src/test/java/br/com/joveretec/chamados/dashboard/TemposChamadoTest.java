package br.com.joveretec.chamados.dashboard;

import br.com.joveretec.chamados.ApiTeste.UsuarioTeste;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static br.com.joveretec.chamados.ApiTeste.como;
import static br.com.joveretec.chamados.ApiTeste.criarChamado;
import static br.com.joveretec.chamados.ApiTeste.criarDesenvolvedor;
import static br.com.joveretec.chamados.ApiTeste.criarProjeto;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.lessThan;
import static org.hamcrest.Matchers.nullValue;

/**
 * Tempo por chamado (dashboard e detalhe), calculado pelos eventos de status. As datas são fixadas
 * no banco para os tempos serem exatos.
 */
@QuarkusTest
class TemposChamadoTest {

    private static final Instant BASE = Instant.parse("2026-01-05T09:00:00Z");
    private static final long HORA = Duration.ofHours(1).toSeconds();
    private static final long DIA = Duration.ofDays(1).toSeconds();

    @Inject
    EntityManager entityManager;

    private UsuarioTeste dev;
    private UsuarioTeste outroDev;
    private long projetoId;
    private long semanaDeTrabalho;
    private long vaiEVolta;
    private long esquecido;
    private long emAndamentoAgora;

    /*
     * semanaDeTrabalho (dev + outroDev): aberto em BASE, em andamento após 1d, concluído após 2d.
     * vaiEVolta (dev): em andamento 1h→3h, volta a aberto, em andamento 5h→6h, concluído em 6h.
     * esquecido (sem responsável): aberto há mais de 10 dias, nunca andou.
     * emAndamentoAgora (dev): criado agora e em andamento.
     */
    @BeforeEach
    void preparar() {
        dev = criarDesenvolvedor();
        outroDev = criarDesenvolvedor();
        projetoId = criarProjeto();

        semanaDeTrabalho = criarCom(List.of(dev.id(), outroDev.id()));
        mudarStatus(semanaDeTrabalho, "EM_ANDAMENTO", "CONCLUIDO");
        datar(semanaDeTrabalho, BASE, BASE.plusSeconds(DIA), BASE.plusSeconds(2 * DIA));

        vaiEVolta = criarCom(List.of(dev.id()));
        mudarStatus(vaiEVolta, "EM_ANDAMENTO", "ABERTO", "EM_ANDAMENTO", "CONCLUIDO");
        datar(vaiEVolta, BASE, BASE.plusSeconds(HORA), BASE.plusSeconds(3 * HORA), BASE.plusSeconds(5 * HORA),
                BASE.plusSeconds(6 * HORA));

        esquecido = criarChamado(dev.token(), projetoId, "Esquecido", "BAIXA", null);
        datar(esquecido, Instant.now().minus(Duration.ofDays(10)));

        emAndamentoAgora = criarChamado(dev.token(), projetoId, "Agora", "ALTA", dev.id());
        mudarStatus(emAndamentoAgora, "EM_ANDAMENTO");
    }

    @Test
    void detalheMostraTempoTotalEEmAndamento() {
        como(dev.token()).get("/api/chamados/{id}", semanaDeTrabalho)
                .then().statusCode(200)
                .body("tempos.totalSegundos", equalTo((int) (2 * DIA)))
                .body("tempos.emAndamentoSegundos", equalTo((int) DIA));

        como(dev.token()).get("/api/chamados/{id}", vaiEVolta)
                .then().body("tempos.totalSegundos", equalTo((int) (6 * HORA)))
                .body("tempos.emAndamentoSegundos", equalTo((int) (3 * HORA)));
    }

    @Test
    void chamadoNaoConcluidoContaAteAgora() {
        como(dev.token()).get("/api/chamados/{id}", esquecido)
                .then().body("tempos.totalSegundos", greaterThan((int) (10 * DIA - 60)))
                .body("tempos.emAndamentoSegundos", equalTo(0));

        como(dev.token()).get("/api/chamados/{id}", emAndamentoAgora)
                .then().body("tempos.totalSegundos", lessThan(120))
                .body("tempos.emAndamentoSegundos", lessThan(120));
    }

    @Test
    void mediasUsamSoOsConcluidos() {
        como(dev.token()).queryParam("projetoId", projetoId).get("/api/dashboard/tempos")
                .then().statusCode(200)
                .body("concluidos", equalTo(2))
                .body("resolucaoMediaSegundos", equalTo((int) ((2 * DIA + 6 * HORA) / 2)))
                .body("andamentoMedioSegundos", equalTo((int) ((DIA + 3 * HORA) / 2)));
    }

    @Test
    void chamadoComVariosResponsaveisContaParaCadaUm() {
        como(dev.token()).queryParam("projetoId", projetoId).get("/api/dashboard/tempos")
                .then()
                .body("porResponsavel", hasSize(2))
                .body("porResponsavel.find { it.usuario.id == " + dev.id() + " }.concluidos", equalTo(2))
                .body("porResponsavel.find { it.usuario.id == " + dev.id() + " }.resolucaoMediaSegundos",
                        equalTo((int) ((2 * DIA + 6 * HORA) / 2)))
                .body("porResponsavel.find { it.usuario.id == " + outroDev.id() + " }.concluidos", equalTo(1))
                .body("porResponsavel.find { it.usuario.id == " + outroDev.id() + " }.andamentoMedioSegundos",
                        equalTo((int) DIA));
    }

    @Test
    void abertosHaMaisTempoDoMaisAntigoParaOMaisNovo() {
        como(dev.token()).queryParam("projetoId", projetoId).get("/api/dashboard/tempos")
                .then()
                .body("abertosHaMaisTempo.chamado.id", contains((int) esquecido, (int) emAndamentoAgora))
                .body("abertosHaMaisTempo[0].status", equalTo("ABERTO"))
                .body("abertosHaMaisTempo[0].urgencia", equalTo("BAIXA"))
                .body("abertosHaMaisTempo[0].abertoHaSegundos", greaterThan((int) (10 * DIA - 60)))
                .body("abertosHaMaisTempo[1].status", equalTo("EM_ANDAMENTO"));
    }

    @Test
    void projetoSemConcluidosTemMediasNulas() {
        long vazio = criarProjeto();
        criarChamado(dev.token(), vazio, "Só aberto", "MEDIA", dev.id());

        como(dev.token()).queryParam("projetoId", vazio).get("/api/dashboard/tempos")
                .then().statusCode(200)
                .body("concluidos", equalTo(0))
                .body("resolucaoMediaSegundos", nullValue())
                .body("andamentoMedioSegundos", nullValue())
                .body("porResponsavel", empty())
                .body("abertosHaMaisTempo", hasSize(1));
    }

    @Test
    void concluidoSemEventoDeStatusUsaAUltimaAtualizacao() {
        long legado = criarChamado(dev.token(), projetoId, "Legado", "MEDIA", dev.id());
        mudarStatus(legado, "CONCLUIDO");
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from historico_chamado where chamado_id = :id and campo = 'STATUS'")
                    .setParameter("id", legado).executeUpdate();
            entityManager.createNativeQuery("update chamado set criado_em = :criado, atualizado_em = :atualizado where id = :id")
                    .setParameter("criado", BASE).setParameter("atualizado", BASE.plusSeconds(4 * HORA))
                    .setParameter("id", legado).executeUpdate();
        });

        como(dev.token()).get("/api/chamados/{id}", legado)
                .then().body("tempos.totalSegundos", equalTo((int) (4 * HORA)))
                .body("tempos.emAndamentoSegundos", equalTo(0));
    }

    private long criarCom(List<Long> responsavelIds) {
        Integer id = como(dev.token())
                .body(Map.of("projetoId", projetoId, "titulo", "Tempo", "descricao", "Teste de tempo",
                        "urgencia", "MEDIA", "responsavelIds", responsavelIds))
                .post("/api/chamados")
                .then().statusCode(201)
                .extract().path("id");
        return id.longValue();
    }

    private void mudarStatus(long chamadoId, String... status) {
        for (String novo : status) {
            como(dev.token()).body(Map.of("status", novo)).patch("/api/chamados/{id}/status", chamadoId)
                    .then().statusCode(200);
        }
    }

    /** Abertura e, na ordem, a data de cada evento de status do chamado. */
    private void datar(long chamadoId, Instant criadoEm, Instant... eventos) {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("update chamado set criado_em = :data where id = :id")
                    .setParameter("data", criadoEm).setParameter("id", chamadoId).executeUpdate();
            @SuppressWarnings("unchecked")
            List<Number> ids = entityManager.createNativeQuery(
                            "select id from historico_chamado where chamado_id = :id and campo = 'STATUS' order by id")
                    .setParameter("id", chamadoId).getResultList();
            for (int i = 0; i < eventos.length; i++) {
                entityManager.createNativeQuery("update historico_chamado set alterado_em = :data where id = :id")
                        .setParameter("data", eventos[i]).setParameter("id", ids.get(i).longValue()).executeUpdate();
            }
        });
    }
}
