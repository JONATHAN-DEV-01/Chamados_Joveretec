package br.com.joveretec.chamados.configuracao.boundary;

import br.com.joveretec.chamados.configuracao.control.Configuracoes;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Locale;

public record ConfiguracaoDTO(
        @NotNull(message = "A paleta é obrigatória.") @Valid PaletaDTO paleta,
        @NotNull(message = "As configurações gerais são obrigatórias.") @Valid GeralDTO geral) {

    private static final String HEX = "^#[0-9A-Fa-f]{6}$";
    private static final String MENSAGEM_HEX = "Use uma cor hexadecimal no formato #RRGGBB.";

    public record PaletaDTO(
            @NotBlank(message = MENSAGEM_HEX) @Pattern(regexp = HEX, message = MENSAGEM_HEX) String fundo,
            @NotBlank(message = MENSAGEM_HEX) @Pattern(regexp = HEX, message = MENSAGEM_HEX) String superficie,
            @NotBlank(message = MENSAGEM_HEX) @Pattern(regexp = HEX, message = MENSAGEM_HEX) String destaque,
            @NotBlank(message = MENSAGEM_HEX) @Pattern(regexp = HEX, message = MENSAGEM_HEX) String texto) {
    }

    public record GeralDTO(
            @NotBlank(message = "O nome do sistema é obrigatório.")
            @Size(max = 60, message = "O nome do sistema deve ter no máximo 60 caracteres.")
            String nomeSistema,
            @NotNull(message = "O tamanho de página padrão é obrigatório.")
            @Min(value = 5, message = "O tamanho de página padrão deve ser no mínimo 5.")
            @Max(value = 100, message = "O tamanho de página padrão deve ser no máximo 100.")
            Integer tamanhoPaginaPadrao) {
    }

    public static ConfiguracaoDTO de(Configuracoes configuracoes) {
        Configuracoes.Paleta p = configuracoes.paleta();
        Configuracoes.Geral g = configuracoes.geral();
        return new ConfiguracaoDTO(new PaletaDTO(p.fundo(), p.superficie(), p.destaque(), p.texto()),
                new GeralDTO(g.nomeSistema(), g.tamanhoPaginaPadrao()));
    }

    public Configuracoes paraConfiguracoes() {
        return new Configuracoes(
                new Configuracoes.Paleta(cor(paleta.fundo()), cor(paleta.superficie()), cor(paleta.destaque()),
                        cor(paleta.texto())),
                new Configuracoes.Geral(geral.nomeSistema().trim(), geral.tamanhoPaginaPadrao()));
    }

    private static String cor(String hex) {
        return hex.toUpperCase(Locale.ROOT);
    }
}
