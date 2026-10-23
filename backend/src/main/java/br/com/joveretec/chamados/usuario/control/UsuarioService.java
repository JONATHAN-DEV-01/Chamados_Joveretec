package br.com.joveretec.chamados.usuario.control;

import br.com.joveretec.chamados.comum.erro.ExcecaoDeNegocio;
import br.com.joveretec.chamados.comum.seguranca.HashDeSenha;
import br.com.joveretec.chamados.usuario.entity.Usuario;
import br.com.joveretec.chamados.usuario.entity.UsuarioRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class UsuarioService {

    private final UsuarioRepository usuarios;
    private final HashDeSenha hashDeSenha;

    public UsuarioService(UsuarioRepository usuarios, HashDeSenha hashDeSenha) {
        this.usuarios = usuarios;
        this.hashDeSenha = hashDeSenha;
    }

    public Usuario buscar(Long id) {
        return usuarios.findByIdOptional(id)
                .orElseThrow(() -> ExcecaoDeNegocio.naoEncontrado("Usuário não encontrado."));
    }

    /** Usuário que está executando a operação; precisa estar ativo. */
    public Usuario buscarAutor(Long id) {
        Usuario usuario = usuarios.findByIdOptional(id)
                .orElseThrow(() -> ExcecaoDeNegocio.naoAutenticado("Usuário do token não existe mais."));
        if (!usuario.isAtivo()) {
            throw ExcecaoDeNegocio.acessoNegado("Usuário desativado.");
        }
        return usuario;
    }

    @Transactional
    public void alterarPropriaSenha(Long usuarioId, String senhaAtual, String novaSenha) {
        Usuario usuario = buscarAutor(usuarioId);
        if (!hashDeSenha.confere(senhaAtual, usuario.getSenhaHash())) {
            throw ExcecaoDeNegocio.regraDeNegocio("A senha atual não confere.");
        }
        usuario.alterarSenhaHash(hashDeSenha.gerar(novaSenha));
    }
}
