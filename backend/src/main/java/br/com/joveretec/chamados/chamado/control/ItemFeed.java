package br.com.joveretec.chamados.chamado.control;

import br.com.joveretec.chamados.chamado.entity.Acompanhamento;
import br.com.joveretec.chamados.chamado.entity.Anexo;
import br.com.joveretec.chamados.chamado.entity.Chamado;
import br.com.joveretec.chamados.chamado.entity.HistoricoChamado;

import java.time.Instant;
import java.util.List;

/** Item da linha do tempo do chamado. */
public sealed interface ItemFeed {

    Instant data();

    /** Descrição inicial do chamado, sempre o primeiro item do feed. */
    record Abertura(Chamado chamado, List<Anexo> anexos) implements ItemFeed {
        @Override
        public Instant data() {
            return chamado.getCriadoEm();
        }
    }

    record DeAcompanhamento(Acompanhamento acompanhamento, List<Anexo> anexos) implements ItemFeed {
        @Override
        public Instant data() {
            return acompanhamento.getCriadoEm();
        }
    }

    /** Mudança automática registrada no histórico (status, responsável, anexo removido...). */
    record Evento(HistoricoChamado registro) implements ItemFeed {
        @Override
        public Instant data() {
            return registro.getAlteradoEm();
        }
    }
}
