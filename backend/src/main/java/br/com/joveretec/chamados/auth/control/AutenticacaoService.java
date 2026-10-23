package br.com.joveretec.chamados.auth.control;

import br.com.joveretec.chamados.auth.control.EmissorDeToken.TokenEmitido;
import br.com.joveretec.chamados.comum.erro.ExcecaoDeNegocio;
import br.com.joveretec.chamados.comum.seguranca.HashDeSenha;
import br.com.joveretec.chamados.usuario.entity.Usuario;
import br.com.joveretec.chamados.usuario.entity.UsuarioRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

@ApplicationScoped
public class AutenticacaoService {

    private static final Logger LOG = Logger.getLogger(AutenticacaoService.class);
    private static final String CREDENCIAIS_INVALIDAS = "E-mail ou senha inválidos.";

    private final UsuarioRepository usuarios;
    private final HashDeSenha hashDeSenha;
    private final EmissorDeToken emissorDeToken;
    /** Hash fictício usado quando o e-mail não existe, para o tempo de resposta não revelar isso. */
    private final String hashFicticio;

    public AutenticacaoService(UsuarioRepository usuarios, HashDeSenha hashDeSenha, EmissorDeToken emissorDeToken) {
        this.usuarios = usuarios;
        this.hashDeSenha = hashDeSenha;
        this.emissorDeToken = emissorDeToken;
        this.hashFicticio = hashDeSenha.gerar("senha-ficticia-para-tempo-constante");
    }

    @Transactional
    public TokenEmitido autenticar(String email, String senha) {
        Usuario usuario = usuarios.buscarPorEmail(email).orElse(null);
        boolean senhaConfere = hashDeSenha.confere(senha, usuario == null ? hashFicticio : usuario.getSenhaHash());
        if (usuario == null || !senhaConfere || !usuario.isAtivo()) {
            LOG.info("Tentativa de login recusada.");
            throw ExcecaoDeNegocio.naoAutenticado(CREDENCIAIS_INVALIDAS);
        }
        LOG.infof("Login realizado pelo usuário id=%d.", usuario.getId());
        return emissorDeToken.emitir(usuario);
    }
}
