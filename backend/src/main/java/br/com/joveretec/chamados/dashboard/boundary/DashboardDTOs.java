package br.com.joveretec.chamados.dashboard.boundary;

import br.com.joveretec.chamados.chamado.boundary.ChamadoDTOs.ReferenciaDTO;
import br.com.joveretec.chamados.chamado.entity.StatusChamado;
import br.com.joveretec.chamados.chamado.entity.Urgencia;
import br.com.joveretec.chamados.dashboard.control.DashboardService.MeusChamados;
import br.com.joveretec.chamados.dashboard.control.DashboardService.TotaisDoDesenvolvedor;

import java.util.List;
import java.util.Map;

public final class DashboardDTOs {

    private DashboardDTOs() {
    }

    public record TotalPorStatusDTO(StatusChamado status, long total) {

        static List<TotalPorStatusDTO> de(Map<StatusChamado, Long> totais) {
            return totais.entrySet().stream().map(e -> new TotalPorStatusDTO(e.getKey(), e.getValue())).toList();
        }
    }

    public record TotalPorUrgenciaDTO(Urgencia urgencia, long total) {

        static List<TotalPorUrgenciaDTO> de(Map<Urgencia, Long> totais) {
            return totais.entrySet().stream().map(e -> new TotalPorUrgenciaDTO(e.getKey(), e.getValue())).toList();
        }
    }

    public record TotalPorDesenvolvedorDTO(ReferenciaDTO usuario, long abertos, long emAndamento, long concluidos,
                                           long total) {

        static TotalPorDesenvolvedorDTO de(TotaisDoDesenvolvedor totais) {
            Map<StatusChamado, Long> porStatus = totais.porStatus();
            return new TotalPorDesenvolvedorDTO(new ReferenciaDTO(totais.usuarioId(), totais.nome()),
                    porStatus.get(StatusChamado.ABERTO), porStatus.get(StatusChamado.EM_ANDAMENTO),
                    porStatus.get(StatusChamado.CONCLUIDO), totais.total());
        }
    }

    public record MeusChamadosDTO(long total, List<TotalPorStatusDTO> porStatus,
                                  List<TotalPorUrgenciaDTO> porUrgencia) {

        static MeusChamadosDTO de(MeusChamados meus) {
            return new MeusChamadosDTO(meus.total(), TotalPorStatusDTO.de(meus.porStatus()),
                    TotalPorUrgenciaDTO.de(meus.porUrgencia()));
        }
    }
}
