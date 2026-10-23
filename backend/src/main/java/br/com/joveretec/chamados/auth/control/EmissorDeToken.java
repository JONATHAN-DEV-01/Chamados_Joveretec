package br.com.joveretec.chamados.auth.control;

import br.com.joveretec.chamados.usuario.entity.Usuario;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

@ApplicationScoped
public class EmissorDeToken {

    private final String emissor;
    private final Duration duracao;

    public EmissorDeToken(@ConfigProperty(name = "mp.jwt.verify.issuer") String emissor,
                          @ConfigProperty(name = "jwt.duracao-minutos") long duracaoMinutos) {
        this.emissor = emissor;
        this.duracao = Duration.ofMinutes(duracaoMinutos);
    }

    public TokenEmitido emitir(Usuario usuario) {
        Instant expiraEm = Instant.now().plus(duracao);
        String token = Jwt.issuer(emissor)
                .subject(String.valueOf(usuario.getId()))
                .upn(usuario.getEmail())
                .claim("name", usuario.getNome())
                .groups(Set.of(usuario.getPerfil().name()))
                .expiresAt(expiraEm)
                .sign();
        return new TokenEmitido(token, expiraEm, usuario);
    }

    public record TokenEmitido(String token, Instant expiraEm, Usuario usuario) {
    }
}
