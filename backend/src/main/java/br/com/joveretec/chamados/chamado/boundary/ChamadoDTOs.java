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

public final class ChamadoDTOs {

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
    }

    public record ChamadoResumoDTO(Long id, String titulo, Urgencia urgencia, StatusChamado status, int posicao,
                                   ReferenciaDTO projeto, ReferenciaDTO responsavel, Instant atualizadoEm) {

        public static ChamadoResumoDTO de(Chamado chamado) {
            return new ChamadoResumoDTO(chamado.getId(), chamado.getTitulo(), chamado.getUrgencia(),
                    chamado.getStatus(), chamado.getPosicao(), ReferenciaDTO.de(chamado.getProjeto()),
                    ReferenciaDTO.de(chamado.getResponsavel()), chamado.getAtualizadoEm());
        }
    }

    public record ChamadoDTO(Long id, String titulo, String descricao, Urgencia urgencia, StatusChamado status,
                             int posicao, ReferenciaDTO projeto, ReferenciaDTO responsavel, ReferenciaDTO criadoPor,
                             Instant criadoEm, Instant atualizadoEm, long versao) {

        public static ChamadoDTO de(Chamado chamado) {
            return new ChamadoDTO(chamado.getId(), chamado.getTitulo(), chamado.getDescricao(),
                    chamado.getUrgencia(), chamado.getStatus(), chamado.getPosicao(),
                    ReferenciaDTO.de(chamado.getProjeto()), ReferenciaDTO.de(chamado.getResponsavel()),
                    ReferenciaDTO.de(chamado.getCriadoPor()), chamado.getCriadoEm(), chamado.getAtualizadoEm(),
                    chamado.getVersao());
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
            Long responsavelId,
            @Min(value = 1, message = "A posição deve ser maior ou igual a 1.")
            Integer posicao) {

        NovoChamado paraComando() {
            return new NovoChamado(projetoId, titulo, descricao, urgencia, responsavelId, posicao);
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
            Long responsavelId,
            @NotNull(message = "A versão é obrigatória (use o valor de 'versao' recebido ao carregar o chamado).")
            Long versao) {

        EdicaoChamado paraComando() {
            return new EdicaoChamado(titulo, descricao, urgencia, responsavelId, versao);
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
