package br.com.joveretec.chamados.comum.armazenamento;

import br.com.joveretec.chamados.comum.armazenamento.AutorizacaoEnvio.Protocolo;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Typed;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;

/**
 * Armazenamento em disco para desenvolvimento e testes, sem Supabase. Imita o fluxo real:
 * o envio e o download usam URLs com token assinado (HMAC, curta duração) atendidas por
 * {@link ArmazenamentoLocalResource}. Não é usado em produção.
 */
@ApplicationScoped
@Typed(LocalArmazenamento.class)
public class LocalArmazenamento implements ArmazenamentoArquivos {

    static final String BASE_URL = "/api/armazenamento-local/";
    private static final Duration VALIDADE_ENVIO = Duration.ofHours(24);

    public enum Acao {
        ENVIO,
        DOWNLOAD
    }

    /** Conteúdo de um token válido. */
    public record Autorizacao(Acao acao, String caminho, Instant expiraEm) {
    }

    private final Path raiz;
    private final byte[] chave = new byte[32];

    public LocalArmazenamento(@ConfigProperty(name = "armazenamento.local.diretorio") String diretorio) {
        this.raiz = Path.of(diretorio).toAbsolutePath().normalize();
        new SecureRandom().nextBytes(chave);
    }

    @Override
    public AutorizacaoEnvio autorizarEnvio(String caminho, String tipoMime) {
        String token = assinar(Acao.ENVIO, caminho, Instant.now().plus(VALIDADE_ENVIO));
        return new AutorizacaoEnvio(Protocolo.PUT, BASE_URL + token, Map.of("Content-Type", tipoMime), Map.of(), 0);
    }

    @Override
    public Optional<Long> tamanho(String caminho) {
        Path arquivo = resolver(caminho);
        try {
            return Files.isRegularFile(arquivo) ? Optional.of(Files.size(arquivo)) : Optional.empty();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public String urlDeDownload(String caminho, String nomeArquivo, boolean inline, Duration validade) {
        String token = assinar(Acao.DOWNLOAD, caminho, Instant.now().plus(validade));
        return BASE_URL + token + "?inline=" + inline + "&nome=" + URLEncoder.encode(nomeArquivo, StandardCharsets.UTF_8);
    }

    @Override
    public void excluir(Collection<String> caminhos) {
        for (String caminho : caminhos) {
            try {
                Files.deleteIfExists(resolver(caminho));
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        }
    }

    /** Grava o conteúdo recebido pelo endpoint local de envio. */
    public void gravar(String caminho, InputStream conteudo) {
        Path destino = resolver(caminho);
        try {
            Files.createDirectories(destino.getParent());
            Files.copy(conteudo, destino, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public Path arquivo(String caminho) {
        return resolver(caminho);
    }

    /** Valida assinatura, ação e validade; vazio se o token não for aceito. */
    public Optional<Autorizacao> validar(String token, Acao acaoEsperada) {
        String[] partes = token.split("\\.", 2);
        if (partes.length != 2 || !MessageDigest.isEqual(hmac(partes[0]), decodificar(partes[1]))) {
            return Optional.empty();
        }
        String[] campos = new String(decodificar(partes[0]), StandardCharsets.UTF_8).split("\n", 3);
        if (campos.length != 3) {
            return Optional.empty();
        }
        Autorizacao autorizacao = new Autorizacao(Acao.valueOf(campos[0]), campos[2],
                Instant.ofEpochSecond(Long.parseLong(campos[1])));
        boolean valido = autorizacao.acao() == acaoEsperada && autorizacao.expiraEm().isAfter(Instant.now());
        return valido ? Optional.of(autorizacao) : Optional.empty();
    }

    private String assinar(Acao acao, String caminho, Instant expiraEm) {
        String conteudo = acao + "\n" + expiraEm.getEpochSecond() + "\n" + caminho;
        String carga = Base64.getUrlEncoder().withoutPadding().encodeToString(conteudo.getBytes(StandardCharsets.UTF_8));
        return carga + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(hmac(carga));
    }

    private byte[] hmac(String carga) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(chave, "HmacSHA256"));
            return mac.doFinal(carga.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static byte[] decodificar(String base64) {
        try {
            return Base64.getUrlDecoder().decode(base64);
        } catch (IllegalArgumentException e) {
            return new byte[0];
        }
    }

    /** Impede que um caminho escape do diretório raiz (ex.: "../"). */
    private Path resolver(String caminho) {
        Path arquivo = raiz.resolve(caminho).normalize();
        if (!arquivo.startsWith(raiz)) {
            throw new IllegalArgumentException("Caminho fora do diretório de armazenamento.");
        }
        return arquivo;
    }
}
