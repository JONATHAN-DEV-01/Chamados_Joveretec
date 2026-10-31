package br.com.joveretec.chamados.chamado.control;

import br.com.joveretec.chamados.comum.erro.ExcecaoDeNegocio;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/** Tamanho máximo e extensões bloqueadas dos anexos (configuráveis; o frontend recebe os mesmos valores). */
@ApplicationScoped
public class LimitesDeAnexo {

    private final long tamanhoMaximoBytes;
    private final Set<String> extensoesBloqueadas;

    public LimitesDeAnexo(@ConfigProperty(name = "anexos.tamanho-maximo-bytes") long tamanhoMaximoBytes,
                          @ConfigProperty(name = "anexos.extensoes-bloqueadas") List<String> extensoesBloqueadas) {
        this.tamanhoMaximoBytes = tamanhoMaximoBytes;
        this.extensoesBloqueadas = extensoesBloqueadas.stream()
                .map(e -> e.strip().toLowerCase(Locale.ROOT))
                .filter(e -> !e.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    public void validar(String nome, long tamanhoBytes) {
        String extensao = extensao(nome);
        if (extensoesBloqueadas.contains(extensao)) {
            throw ExcecaoDeNegocio.regraDeNegocio("Arquivos ." + extensao + " não são permitidos.");
        }
        validarTamanho(tamanhoBytes);
    }

    public void validarTamanho(long tamanhoBytes) {
        if (tamanhoBytes > tamanhoMaximoBytes) {
            throw ExcecaoDeNegocio.regraDeNegocio("O arquivo tem " + emMegabytes(tamanhoBytes)
                    + " e o limite é " + emMegabytes(tamanhoMaximoBytes) + ".");
        }
    }

    public long tamanhoMaximoBytes() {
        return tamanhoMaximoBytes;
    }

    public List<String> extensoesBloqueadas() {
        return extensoesBloqueadas.stream().sorted().toList();
    }

    private static String extensao(String nome) {
        String texto = nome == null ? "" : nome.strip();
        int ponto = texto.lastIndexOf('.');
        return ponto < 0 ? "" : texto.substring(ponto + 1).toLowerCase(Locale.ROOT);
    }

    private static String emMegabytes(long bytes) {
        return String.format(Locale.forLanguageTag("pt-BR"), "%.1f MB", bytes / (1024.0 * 1024.0));
    }
}
