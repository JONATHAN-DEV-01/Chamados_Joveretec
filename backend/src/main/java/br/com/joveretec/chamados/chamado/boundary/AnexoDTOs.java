package br.com.joveretec.chamados.chamado.boundary;

import br.com.joveretec.chamados.chamado.boundary.FeedDTOs.AnexoDTO;
import br.com.joveretec.chamados.chamado.control.AnexoService.LinkDoAnexo;
import br.com.joveretec.chamados.chamado.control.AnexoService.PedidoDeEnvio;
import br.com.joveretec.chamados.comum.armazenamento.AutorizacaoEnvio;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Map;

public final class AnexoDTOs {

    private AnexoDTOs() {
    }

    /** Tamanho e extensão são validados em {@code LimitesDeAnexo}. */
    public record SolicitarEnvioRequest(
            @NotBlank(message = "O nome do arquivo é obrigatório.")
            @Size(max = 1000, message = "O nome do arquivo é longo demais.")
            String nome,
            @Size(max = 255, message = "O tipo do arquivo é longo demais.")
            String tipoMime,
            @NotNull(message = "O tamanho do arquivo é obrigatório.")
            @Min(value = 0, message = "O tamanho do arquivo não pode ser negativo.")
            Long tamanhoBytes,
            /* Rascunho de acompanhamento; vazio para anexar à abertura do chamado. */
            Long acompanhamentoId) {

        PedidoDeEnvio paraPedido() {
            return new PedidoDeEnvio(nome, tipoMime, tamanhoBytes, acompanhamentoId);
        }
    }

    /** Como o navegador deve enviar o arquivo (ver {@link AutorizacaoEnvio}). */
    public record EnvioDTO(AutorizacaoEnvio.Protocolo protocolo, String url, Map<String, String> cabecalhos,
                           Map<String, String> metadados, long tamanhoParte) {

        static EnvioDTO de(AutorizacaoEnvio autorizacao) {
            return new EnvioDTO(autorizacao.protocolo(), autorizacao.url(), autorizacao.cabecalhos(),
                    autorizacao.metadados(), autorizacao.tamanhoParte());
        }
    }

    public record EnvioAutorizadoDTO(AnexoDTO anexo, EnvioDTO envio) {
    }

    public record DownloadDTO(String url, Instant expiraEm) {
    }

    public record LinkDTO(Long anexoId, String url, Instant expiraEm) {

        static LinkDTO de(LinkDoAnexo link) {
            return new LinkDTO(link.anexoId(), link.link().url(), link.link().expiraEm());
        }
    }
}
