package br.com.joveretec.chamados.usuario.control;

import br.com.joveretec.chamados.comum.seguranca.HashDeSenha;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import br.com.joveretec.chamados.usuario.entity.Usuario;
import br.com.joveretec.chamados.usuario.entity.UsuarioRepository;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Cria o administrador inicial na subida da aplicação quando ainda não existe nenhum admin.
 * As credenciais vêm de variáveis de ambiente (ADMIN_NOME, ADMIN_EMAIL, ADMIN_SENHA).
 */
@ApplicationScoped
public class AdminInicial {

    private static final Logger LOG = Logger.getLogger(AdminInicial.class);

    private final UsuarioRepository usuarios;
    private final HashDeSenha hashDeSenha;
    private final String nome;
    private final String email;
    private final String senha;

    public AdminInicial(UsuarioRepository usuarios, HashDeSenha hashDeSenha,
                        @ConfigProperty(name = "admin.inicial.nome") String nome,
                        @ConfigProperty(name = "admin.inicial.email") String email,
                        @ConfigProperty(name = "admin.inicial.senha") String senha) {
        this.usuarios = usuarios;
        this.hashDeSenha = hashDeSenha;
        this.nome = nome;
        this.email = email;
        this.senha = senha;
    }

    @Transactional
    void aoIniciar(@Observes StartupEvent evento) {
        if (usuarios.count("perfil", Perfil.ADMIN) > 0) {
            return;
        }
        usuarios.persist(new Usuario(nome, email, hashDeSenha.gerar(senha), Perfil.ADMIN));
        LOG.info("Administrador inicial criado.");
    }
}
