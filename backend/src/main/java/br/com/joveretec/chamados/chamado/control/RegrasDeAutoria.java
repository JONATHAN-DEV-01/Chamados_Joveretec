package br.com.joveretec.chamados.chamado.control;

import br.com.joveretec.chamados.comum.erro.ExcecaoDeNegocio;
import br.com.joveretec.chamados.usuario.entity.Usuario;

/** Quem pode editar/excluir conteúdo do feed: o próprio autor ou um administrador. */
public final class RegrasDeAutoria {

    private RegrasDeAutoria() {
    }

    public static boolean podeAlterar(Long autorId, Long usuarioId, boolean usuarioEhAdmin) {
        return usuarioEhAdmin || autorId.equals(usuarioId);
    }

    public static void garantir(Usuario autor, Usuario usuario, String mensagem) {
        if (!podeAlterar(autor.getId(), usuario.getId(), usuario.isAdmin())) {
            throw ExcecaoDeNegocio.acessoNegado(mensagem);
        }
    }
}
