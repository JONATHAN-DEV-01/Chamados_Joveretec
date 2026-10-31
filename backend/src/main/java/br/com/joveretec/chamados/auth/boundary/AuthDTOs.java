package br.com.joveretec.chamados.auth.boundary;

import br.com.joveretec.chamados.auth.control.EmissorDeToken.TokenEmitido;
import br.com.joveretec.chamados.configuracao.boundary.ConfiguracaoDTO.PaletaDTO;
import br.com.joveretec.chamados.usuario.boundary.UsuarioDTO;
import br.com.joveretec.chamados.usuario.entity.PaletaPessoal;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import br.com.joveretec.chamados.usuario.entity.Usuario;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class AuthDTOs {

    private AuthDTOs() {
    }

    public record LoginRequest(
            @NotBlank(message = "O e-mail é obrigatório.")
            @Email(message = "Informe um e-mail válido.")
            String email,
            @NotBlank(message = "A senha é obrigatória.")
            String senha) {
    }

    public record LoginResponse(String token, Instant expiraEm, UsuarioLogadoDTO usuario) {

        static LoginResponse de(TokenEmitido emitido) {
            return new LoginResponse(emitido.token(), emitido.expiraEm(), UsuarioLogadoDTO.de(emitido.usuario()));
        }
    }

    public record AlterarSenhaRequest(
            @NotBlank(message = "A senha atual é obrigatória.")
            String senhaAtual,
            @NotBlank(message = "A nova senha é obrigatória.")
            @Size(min = 8, max = 72, message = "A nova senha deve ter entre 8 e 72 caracteres.")
            String novaSenha) {
    }

    /**
     * O próprio usuário: os campos de {@link UsuarioDTO} mais a paleta pessoal, que só ele vê
     * ({@code null} = segue a paleta global do sistema).
     */
    public record UsuarioLogadoDTO(Long id, String nome, String email, Perfil perfil, boolean ativo, Instant criadoEm,
                                   PaletaDTO paleta) {

        static UsuarioLogadoDTO de(Usuario usuario) {
            return new UsuarioLogadoDTO(usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getPerfil(),
                    usuario.isAtivo(), usuario.getCriadoEm(), usuario.getPaleta().map(AuthDTOs::paleta).orElse(null));
        }
    }

    static PaletaDTO paleta(PaletaPessoal paleta) {
        return new PaletaDTO(paleta.fundo(), paleta.superficie(), paleta.destaque(), paleta.texto());
    }

    static PaletaPessoal paleta(PaletaDTO paleta) {
        return new PaletaPessoal(paleta.fundo(), paleta.superficie(), paleta.destaque(), paleta.texto());
    }
}
