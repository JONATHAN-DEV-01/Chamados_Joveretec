package br.com.joveretec.chamados.comum.seguranca;

import br.com.joveretec.chamados.usuario.entity.Perfil;
import jakarta.enterprise.context.RequestScoped;
import org.eclipse.microprofile.jwt.JsonWebToken;

/** Dados do usuário autenticado na requisição atual, extraídos do JWT. */
@RequestScoped
public class UsuarioLogado {

    private final JsonWebToken token;

    public UsuarioLogado(JsonWebToken token) {
        this.token = token;
    }

    public Long id() {
        return Long.valueOf(token.getSubject());
    }

    public boolean isAdmin() {
        return token.getGroups().contains(Perfil.ROLE_ADMIN);
    }
}
