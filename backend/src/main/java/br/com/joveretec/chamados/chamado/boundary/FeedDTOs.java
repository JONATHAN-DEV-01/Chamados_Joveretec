package br.com.joveretec.chamados.chamado.boundary;

import br.com.joveretec.chamados.chamado.boundary.ChamadoDTOs.HistoricoDTO;
import br.com.joveretec.chamados.chamado.boundary.ChamadoDTOs.ReferenciaDTO;
import br.com.joveretec.chamados.chamado.control.AcompanhamentoService.ComAnexos;
import br.com.joveretec.chamados.chamado.control.AcompanhamentoService.NovoAcompanhamento;
import br.com.joveretec.chamados.chamado.control.ItemFeed;
import br.com.joveretec.chamados.chamado.control.RegrasDeAutoria;
import br.com.joveretec.chamados.chamado.entity.Acompanhamento;
import br.com.joveretec.chamados.chamado.entity.Acompanhamento.DadosAcompanhamento;
import br.com.joveretec.chamados.chamado.entity.Anexo;
import br.com.joveretec.chamados.chamado.entity.Chamado;
import br.com.joveretec.chamados.chamado.entity.FeedRepository.TipoItem;
import br.com.joveretec.chamados.chamado.entity.TipoAcompanhamento;
import br.com.joveretec.chamados.comum.seguranca.UsuarioLogado;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class FeedDTOs {

    private static final int TEXTO_MAXIMO = 50_000;
    private static final int TEMPO_MAXIMO_MINUTOS = 100_000;

    private FeedDTOs() {
    }

    /**
     * Quem está lendo o feed: define as permissões exibidas (podeAlterar/podeExcluir).
     * Em projeto arquivado nada pode ser alterado.
     */
    public record Leitor(Long id, boolean admin, boolean projetoArquivado) {

        static Leitor de(UsuarioLogado usuario, Chamado chamado) {
            return new Leitor(usuario.id(), usuario.isAdmin(), chamado.getProjeto().isArquivado());
        }

        boolean podeAlterar(Long autorId) {
            return !projetoArquivado && RegrasDeAutoria.podeAlterar(autorId, id, admin);
        }
    }

    public record AnexoDTO(Long id, String nome, String tipoMime, long tamanhoBytes, Anexo.Status status,
                           ReferenciaDTO enviadoPor, Instant criadoEm, boolean podeExcluir) {

        public static AnexoDTO de(Anexo anexo, Leitor leitor) {
            return new AnexoDTO(anexo.getId(), anexo.getNomeOriginal(), anexo.getTipoMime(), anexo.getTamanhoBytes(),
                    anexo.getStatus(), ReferenciaDTO.de(anexo.getEnviadoPor()), anexo.getCriadoEm(),
                    leitor.podeAlterar(anexo.getEnviadoPor().getId()));
        }

        static List<AnexoDTO> de(List<Anexo> anexos, Leitor leitor) {
            return anexos.stream().map(a -> de(a, leitor)).toList();
        }
    }

    public record AcompanhamentoDTO(Long id, TipoAcompanhamento tipo, String texto, Integer tempoGastoMinutos,
                                    ReferenciaDTO autor, Instant criadoEm, Instant editadoEm, boolean podeAlterar,
                                    List<AnexoDTO> anexos) {

        public static AcompanhamentoDTO de(ComAnexos item, Leitor leitor) {
            return de(item.acompanhamento(), item.anexos(), leitor);
        }

        static AcompanhamentoDTO de(Acompanhamento a, List<Anexo> anexos, Leitor leitor) {
            return new AcompanhamentoDTO(a.getId(), a.getTipo(), a.getTexto(), a.getTempoGastoMinutos(),
                    ReferenciaDTO.de(a.getAutor()), a.getCriadoEm(), a.getEditadoEm(),
                    leitor.podeAlterar(a.getAutor().getId()), AnexoDTO.de(anexos, leitor));
        }
    }

    /** Descrição inicial do chamado, exibida como primeiro item do feed. */
    public record AberturaDTO(String descricao, ReferenciaDTO autor, Instant criadoEm, List<AnexoDTO> anexos) {
    }

    /** Item do feed: apenas o campo correspondente ao {@code tipo} vem preenchido. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ItemFeedDTO(TipoItem tipo, Instant data, AberturaDTO abertura, AcompanhamentoDTO acompanhamento,
                              HistoricoDTO evento) {

        static ItemFeedDTO de(ItemFeed item, Leitor leitor) {
            return switch (item) {
                case ItemFeed.Abertura a -> new ItemFeedDTO(TipoItem.ABERTURA, a.data(), new AberturaDTO(
                        a.chamado().getDescricao(), ReferenciaDTO.de(a.chamado().getCriadoPor()), a.data(),
                        AnexoDTO.de(a.anexos(), leitor)), null, null);
                case ItemFeed.DeAcompanhamento d -> new ItemFeedDTO(TipoItem.ACOMPANHAMENTO, d.data(), null,
                        AcompanhamentoDTO.de(d.acompanhamento(), d.anexos(), leitor), null);
                case ItemFeed.Evento e -> new ItemFeedDTO(TipoItem.EVENTO, e.data(), null, null,
                        HistoricoDTO.de(e.registro()));
            };
        }
    }

    /** Resposta da criação de rascunho: só o id, usado no caminho dos anexos. */
    public record RascunhoDTO(Long id) {
    }

    public record SalvarAcompanhamentoRequest(
            @NotBlank(message = "O texto do acompanhamento é obrigatório.")
            @Size(max = TEXTO_MAXIMO, message = "O texto deve ter no máximo " + TEXTO_MAXIMO + " caracteres.")
            String texto,
            TipoAcompanhamento tipo,
            @Min(value = 0, message = "O tempo gasto não pode ser negativo.")
            @Max(value = TEMPO_MAXIMO_MINUTOS, message = "O tempo gasto deve ser de no máximo "
                    + TEMPO_MAXIMO_MINUTOS + " minutos.")
            Integer tempoGastoMinutos) {

        DadosAcompanhamento paraDados() {
            return new DadosAcompanhamento(texto, tipo == null ? TipoAcompanhamento.ACOMPANHAMENTO : tipo,
                    tempoGastoMinutos);
        }
    }

    public record CriarAcompanhamentoRequest(
            @NotBlank(message = "O texto do acompanhamento é obrigatório.")
            @Size(max = TEXTO_MAXIMO, message = "O texto deve ter no máximo " + TEXTO_MAXIMO + " caracteres.")
            String texto,
            TipoAcompanhamento tipo,
            @Min(value = 0, message = "O tempo gasto não pode ser negativo.")
            @Max(value = TEMPO_MAXIMO_MINUTOS, message = "O tempo gasto deve ser de no máximo "
                    + TEMPO_MAXIMO_MINUTOS + " minutos.")
            Integer tempoGastoMinutos,
            /* Só para tipo SOLUCAO: muda o status do chamado para CONCLUIDO na mesma ação. */
            boolean concluirChamado,
            /* Rascunho que já recebeu os anexos (opcional). */
            Long rascunhoId) {

        NovoAcompanhamento paraComando() {
            DadosAcompanhamento dados = new SalvarAcompanhamentoRequest(texto, tipo, tempoGastoMinutos).paraDados();
            return new NovoAcompanhamento(dados, concluirChamado, rascunhoId);
        }
    }
}
