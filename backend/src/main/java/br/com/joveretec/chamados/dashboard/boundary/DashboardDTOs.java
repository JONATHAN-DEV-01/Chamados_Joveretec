package br.com.joveretec.chamados.dashboard.boundary;

import br.com.joveretec.chamados.chamado.boundary.ChamadoDTOs.ReferenciaDTO;
import br.com.joveretec.chamados.chamado.entity.Acompanhamento;
import br.com.joveretec.chamados.chamado.entity.StatusChamado;
import br.com.joveretec.chamados.chamado.entity.TipoAcompanhamento;
import br.com.joveretec.chamados.chamado.entity.Urgencia;
import br.com.joveretec.chamados.dashboard.control.DashboardService.MeusChamados;
import br.com.joveretec.chamados.dashboard.control.DashboardService.TotaisDoDesenvolvedor;

import java.time.Instant;
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

    public record UltimaAtualizacaoDTO(Long acompanhamentoId, ReferenciaChamadoDTO chamado, ReferenciaDTO autor,
                                       TipoAcompanhamento tipo, String resumo, Instant criadoEm) {

        private static final int TAMANHO_RESUMO = 160;

        static UltimaAtualizacaoDTO de(Acompanhamento a) {
            return new UltimaAtualizacaoDTO(a.getId(),
                    new ReferenciaChamadoDTO(a.getChamado().getId(), a.getChamado().getTitulo()),
                    new ReferenciaDTO(a.getAutor().getId(), a.getAutor().getNome()), a.getTipo(),
                    resumo(a.getTexto()), a.getCriadoEm());
        }

        /** Primeiros caracteres do texto, em uma linha e sem a marcação do Markdown. */
        private static String resumo(String texto) {
            String linha = texto.replaceAll("!?\\[([^\\]]*)]\\(anexo:\\d+\\)", "📎 $1")
                    .replaceAll("(?m)^\\s*([-*+]|\\d+\\.)\\s+", "")
                    .replaceAll("[*_`#>~]", "")
                    .replaceAll("\\s+", " ")
                    .strip();
            return linha.length() <= TAMANHO_RESUMO ? linha : linha.substring(0, TAMANHO_RESUMO - 1) + "…";
        }
    }

    public record ReferenciaChamadoDTO(Long id, String titulo) {
    }

    public record MeusChamadosDTO(long total, List<TotalPorStatusDTO> porStatus,
                                  List<TotalPorUrgenciaDTO> porUrgencia) {

        static MeusChamadosDTO de(MeusChamados meus) {
            return new MeusChamadosDTO(meus.total(), TotalPorStatusDTO.de(meus.porStatus()),
                    TotalPorUrgenciaDTO.de(meus.porUrgencia()));
        }
    }
}
