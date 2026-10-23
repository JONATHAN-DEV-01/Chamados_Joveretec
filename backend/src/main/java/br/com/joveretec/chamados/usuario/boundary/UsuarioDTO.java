package br.com.joveretec.chamados.usuario.boundary;

import br.com.joveretec.chamados.usuario.entity.Perfil;
import br.com.joveretec.chamados.usuario.entity.Usuario;

import java.time.Instant;

public record UsuarioDTO(Long id, String nome, String email, Perfil perfil, boolean ativo, Instant criadoEm) {

    public static UsuarioDTO de(Usuario usuario) {
        return new UsuarioDTO(usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getPerfil(),
                usuario.isAtivo(), usuario.getCriadoEm());
    }
}
