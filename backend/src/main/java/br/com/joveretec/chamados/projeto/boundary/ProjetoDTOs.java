package br.com.joveretec.chamados.projeto.boundary;

import br.com.joveretec.chamados.projeto.entity.Projeto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class ProjetoDTOs {

    private ProjetoDTOs() {
    }

    public record ProjetoDTO(Long id, String nome, String descricao, boolean arquivado,
                             Instant criadoEm, Instant atualizadoEm) {

        public static ProjetoDTO de(Projeto projeto) {
            return new ProjetoDTO(projeto.getId(), projeto.getNome(), projeto.getDescricao(), projeto.isArquivado(),
                    projeto.getCriadoEm(), projeto.getAtualizadoEm());
        }
    }

    public record SalvarProjetoRequest(
            @NotBlank(message = "O nome é obrigatório.")
            @Size(max = 120, message = "O nome deve ter no máximo 120 caracteres.")
            String nome,
            @Size(max = 5000, message = "A descrição deve ter no máximo 5000 caracteres.")
            String descricao) {
    }
}
