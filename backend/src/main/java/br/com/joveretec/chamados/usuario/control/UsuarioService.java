package br.com.joveretec.chamados.usuario.control;

import br.com.joveretec.chamados.comum.erro.ExcecaoDeNegocio;
import br.com.joveretec.chamados.comum.paginacao.Pagina;
import br.com.joveretec.chamados.comum.paginacao.Paginacao;
import br.com.joveretec.chamados.comum.seguranca.HashDeSenha;
import br.com.joveretec.chamados.usuario.entity.FiltroUsuarios;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import br.com.joveretec.chamados.usuario.entity.Usuario;
import br.com.joveretec.chamados.usuario.entity.UsuarioRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

@ApplicationScoped
public class UsuarioService {

    private static final Logger LOG = Logger.getLogger(UsuarioService.class);

    private final UsuarioRepository usuarios;
    private final HashDeSenha hashDeSenha;

    public UsuarioService(UsuarioRepository usuarios, HashDeSenha hashDeSenha) {
        this.usuarios = usuarios;
        this.hashDeSenha = hashDeSenha;
    }

    public Pagina<Usuario> listar(FiltroUsuarios filtro, Paginacao paginacao) {
        return Pagina.de(usuarios.listar(filtro), paginacao);
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

    /** Usuário que pode receber chamados; precisa existir e estar ativo. */
    public Usuario buscarResponsavel(Long id) {
        Usuario usuario = usuarios.findByIdOptional(id)
                .orElseThrow(() -> ExcecaoDeNegocio.regraDeNegocio("Responsável informado não existe."));
        if (!usuario.isAtivo()) {
            throw ExcecaoDeNegocio.regraDeNegocio("Não é possível atribuir chamados a um usuário desativado.");
        }
        return usuario;
    }

    @Transactional
    public Usuario criar(String nome, String email, String senha, Perfil perfil) {
        garantirEmailDisponivel(email, null);
        Usuario usuario = new Usuario(nome, email, hashDeSenha.gerar(senha), perfil);
        usuarios.persist(usuario);
        LOG.infof("Usuário id=%d criado com perfil %s.", usuario.getId(), perfil);
        return usuario;
    }

    @Transactional
    public Usuario atualizar(Long id, String nome, String email, Perfil perfil, String novaSenha) {
        Usuario usuario = buscar(id);
        garantirEmailDisponivel(email, id);
        if (usuario.isAdmin() && perfil != Perfil.ADMIN) {
            garantirQueNaoEhUltimoAdmin(usuario);
        }
        usuario.atualizarDados(nome, email, perfil);
        if (novaSenha != null && !novaSenha.isBlank()) {
            usuario.alterarSenhaHash(hashDeSenha.gerar(novaSenha));
        }
        return usuario;
    }

    @Transactional
    public Usuario desativar(Long id, Long autorId) {
        Usuario usuario = buscar(id);
        if (usuario.getId().equals(autorId)) {
            throw ExcecaoDeNegocio.regraDeNegocio("Você não pode desativar o seu próprio usuário.");
        }
        if (usuario.isAdmin()) {
            garantirQueNaoEhUltimoAdmin(usuario);
        }
        usuario.desativar();
        LOG.infof("Usuário id=%d desativado.", id);
        return usuario;
    }

    @Transactional
    public Usuario reativar(Long id) {
        Usuario usuario = buscar(id);
        usuario.reativar();
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

    private void garantirEmailDisponivel(String email, Long ignorarId) {
        if (usuarios.emailEmUso(email, ignorarId)) {
            throw ExcecaoDeNegocio.conflito("Já existe um usuário com este e-mail.");
        }
    }

    private void garantirQueNaoEhUltimoAdmin(Usuario admin) {
        if (admin.isAtivo() && usuarios.contarAdminsAtivos() <= 1) {
            throw ExcecaoDeNegocio.regraDeNegocio("O sistema precisa ter pelo menos um administrador ativo.");
        }
    }
}
