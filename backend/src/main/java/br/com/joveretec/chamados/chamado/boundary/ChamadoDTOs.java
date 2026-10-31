package br.com.joveretec.chamados.chamado.boundary;

import br.com.joveretec.chamados.chamado.control.EdicaoChamado;
import br.com.joveretec.chamados.chamado.control.NovoChamado;
import br.com.joveretec.chamados.chamado.entity.CampoHistorico;
import br.com.joveretec.chamados.chamado.entity.Chamado;
import br.com.joveretec.chamados.chamado.entity.HistoricoChamado;
import br.com.joveretec.chamados.chamado.entity.StatusChamado;
import br.com.joveretec.chamados.chamado.entity.Urgencia;
import br.com.joveretec.chamados.projeto.entity.Projeto;
import br.com.joveretec.chamados.usuario.entity.Usuario;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

public final class ChamadoDTOs {

    static final int MAXIMO_RESPONSAVEIS = 20;
    static final String MENSAGEM_MAXIMO_RESPONSAVEIS = "Um chamado pode ter no máximo 20 responsáveis.";

    private ChamadoDTOs() {
    }

    /** Referência resumida (id + nome) a um projeto ou usuário. */
    public record ReferenciaDTO(Long id, String nome) {

        static ReferenciaDTO de(Projeto projeto) {
            return new ReferenciaDTO(projeto.getId(), projeto.getNome());
        }

        static ReferenciaDTO de(Usuario usuario) {
            return usuario == null ? null : new ReferenciaDTO(usuario.getId(), usuario.getNome());
        }

        static List<ReferenciaDTO> de(List<Usuario> usuarios) {
            return usuarios.stream().map(ReferenciaDTO::de).toList();
        }

        /** Primeiro da lista: campo {@code responsavel} mantido para clientes da versão anterior. */
        static ReferenciaDTO primeiro(List<Usuario> usuarios) {
            return usuarios.isEmpty() ? null : de(usuarios.getFirst());
        }
    }

    /**
     * Junta {@code responsavelIds} (atual) e {@code responsavelId} (versão anterior do frontend,
     * que pode estar no ar por alguns minutos durante o deploy) em um conjunto sem repetição.
     */
    static Set<Long> idsDosResponsaveis(List<Long> responsavelIds, Long responsavelId) {
        Set<Long> ids = new LinkedHashSet<>();
        if (responsavelIds != null) {
            responsavelIds.stream().filter(Objects::nonNull).forEach(ids::add);
        } else if (responsavelId != null) {
            ids.add(responsavelId);
        }
        return ids;
    }

    /** {@code ultimaAtividadeEm} inclui acompanhamentos e anexos; {@code atualizadoEm}, só os dados do chamado. */
    /** {@code posicao} é {@code null} para chamados concluídos (eles saem da fila). */
    public record ChamadoResumoDTO(Long id, String titulo, Urgencia urgencia, StatusChamado status, Integer posicao,
                                   ReferenciaDTO projeto, List<ReferenciaDTO> responsaveis,
                                   ReferenciaDTO responsavel, Instant atualizadoEm, Instant ultimaAtividadeEm) {

        public static ChamadoResumoDTO de(Chamado chamado) {
            List<Usuario> responsaveis = chamado.getResponsaveis();
            return new ChamadoResumoDTO(chamado.getId(), chamado.getTitulo(), chamado.getUrgencia(),
                    chamado.getStatus(), chamado.getPosicao(), ReferenciaDTO.de(chamado.getProjeto()),
                    ReferenciaDTO.de(responsaveis), ReferenciaDTO.primeiro(responsaveis), chamado.getAtualizadoEm(),
                    chamado.getUltimaAtividadeEm());
        }
    }

    public record ChamadoDTO(Long id, String titulo, String descricao, Urgencia urgencia, StatusChamado status,
                             Integer posicao, ReferenciaDTO projeto, List<ReferenciaDTO> responsaveis,
                             ReferenciaDTO responsavel, ReferenciaDTO criadoPor,
                             Instant criadoEm, Instant atualizadoEm, Instant ultimaAtividadeEm,
                             long tempoGastoTotalMinutos, long versao) {

        public static ChamadoDTO de(Chamado chamado, long tempoGastoTotalMinutos) {
            List<Usuario> responsaveis = chamado.getResponsaveis();
            return new ChamadoDTO(chamado.getId(), chamado.getTitulo(), chamado.getDescricao(),
                    chamado.getUrgencia(), chamado.getStatus(), chamado.getPosicao(),
                    ReferenciaDTO.de(chamado.getProjeto()), ReferenciaDTO.de(responsaveis),
                    ReferenciaDTO.primeiro(responsaveis), ReferenciaDTO.de(chamado.getCriadoPor()), chamado.getCriadoEm(), chamado.getAtualizadoEm(),
                    chamado.getUltimaAtividadeEm(), tempoGastoTotalMinutos, chamado.getVersao());
        }
    }

    public record HistoricoDTO(Long id, CampoHistorico campo, String valorAnterior, String valorNovo,
                               ReferenciaDTO usuario, Instant alteradoEm) {

        public static HistoricoDTO de(HistoricoChamado registro) {
            return new HistoricoDTO(registro.getId(), registro.getCampo(), registro.getValorAnterior(),
                    registro.getValorNovo(), ReferenciaDTO.de(registro.getUsuario()), registro.getAlteradoEm());
        }
    }

    public record CriarChamadoRequest(
            @NotNull(message = "O projeto é obrigatório.")
            Long projetoId,
            @NotBlank(message = "O título é obrigatório.")
            @Size(max = 200, message = "O título deve ter no máximo 200 caracteres.")
            String titulo,
            @NotBlank(message = "A descrição é obrigatória.")
            @Size(max = 20000, message = "A descrição deve ter no máximo 20000 caracteres.")
            String descricao,
            @NotNull(message = "A urgência é obrigatória (BAIXA, MEDIA, ALTA ou CRITICA).")
            Urgencia urgencia,
            @Size(max = MAXIMO_RESPONSAVEIS, message = MENSAGEM_MAXIMO_RESPONSAVEIS)
            List<Long> responsavelIds,
            Long responsavelId,
            @Min(value = 1, message = "A posição deve ser maior ou igual a 1.")
            Integer posicao,
            /* Anexos colados/arrastados na descrição antes de o chamado existir (POST /api/anexos/rascunhos). */
            @Size(max = 50, message = "Um chamado pode ser aberto com no máximo 50 anexos.")
            List<Long> anexoIds) {

        NovoChamado paraComando() {
            Set<Long> anexos = new LinkedHashSet<>();
            if (anexoIds != null) {
                anexoIds.stream().filter(Objects::nonNull).forEach(anexos::add);
            }
            return new NovoChamado(projetoId, titulo, descricao, urgencia,
                    idsDosResponsaveis(responsavelIds, responsavelId), posicao, anexos);
        }
    }

    public record AtualizarChamadoRequest(
            @NotBlank(message = "O título é obrigatório.")
            @Size(max = 200, message = "O título deve ter no máximo 200 caracteres.")
            String titulo,
            @NotBlank(message = "A descrição é obrigatória.")
            @Size(max = 20000, message = "A descrição deve ter no máximo 20000 caracteres.")
            String descricao,
            @NotNull(message = "A urgência é obrigatória (BAIXA, MEDIA, ALTA ou CRITICA).")
            Urgencia urgencia,
            @Size(max = MAXIMO_RESPONSAVEIS, message = MENSAGEM_MAXIMO_RESPONSAVEIS)
            List<Long> responsavelIds,
            Long responsavelId,
            @NotNull(message = "A versão é obrigatória (use o valor de 'versao' recebido ao carregar o chamado).")
            Long versao) {

        EdicaoChamado paraComando() {
            return new EdicaoChamado(titulo, descricao, urgencia, idsDosResponsaveis(responsavelIds, responsavelId),
                    versao);
        }
    }

    public record AlterarStatusRequest(
            @NotNull(message = "O status é obrigatório (ABERTO, EM_ANDAMENTO ou CONCLUIDO).")
            StatusChamado status) {
    }

    public record ReordenarRequest(
            @NotNull(message = "A posição é obrigatória.")
            @Min(value = 1, message = "A posição deve ser maior ou igual a 1.")
            Integer posicao) {
    }
}
