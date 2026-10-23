package br.com.joveretec.chamados.auth.boundary;

import br.com.joveretec.chamados.auth.control.EmissorDeToken.TokenEmitido;
import br.com.joveretec.chamados.usuario.boundary.UsuarioDTO;
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

    public record LoginResponse(String token, Instant expiraEm, UsuarioDTO usuario) {

        static LoginResponse de(TokenEmitido emitido) {
            return new LoginResponse(emitido.token(), emitido.expiraEm(), UsuarioDTO.de(emitido.usuario()));
        }
    }

    public record AlterarSenhaRequest(
            @NotBlank(message = "A senha atual é obrigatória.")
            String senhaAtual,
            @NotBlank(message = "A nova senha é obrigatória.")
            @Size(min = 8, max = 72, message = "A nova senha deve ter entre 8 e 72 caracteres.")
            String novaSenha) {
    }
}
