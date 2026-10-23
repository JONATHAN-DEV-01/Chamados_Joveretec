package br.com.joveretec.chamados.chamado.control;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Organização dos objetos no bucket:
 * {@code projetos/{projetoId}/chamados/{chamadoId}/{origem}/{anexoId}-{nomeSanitizado}},
 * com {@code origem} = {@code abertura} ou {@code acompanhamentos/{acompanhamentoId}}.
 */
public final class CaminhoDoAnexo {

    private static final int TAMANHO_MAXIMO_NOME = 120;
    private static final String NOME_PADRAO = "arquivo";

    private CaminhoDoAnexo() {
    }

    public static String pasta(Long projetoId, Long chamadoId, Long acompanhamentoId) {
        String origem = acompanhamentoId == null ? "abertura" : "acompanhamentos/" + acompanhamentoId;
        return "projetos/" + projetoId + "/chamados/" + chamadoId + "/" + origem + "/";
    }

    public static String arquivo(String pasta, Long anexoId, String nomeOriginal) {
        return pasta + anexoId + "-" + sanitizar(nomeOriginal);
    }

    /**
     * Remove acentos, troca espaços e caracteres especiais por hífen e preserva a extensão
     * (ex.: {@code "Relatório Final (v2).PDF"} → {@code "Relatorio-Final-v2.pdf"}).
     */
    public static String sanitizar(String nome) {
        String semAcentos = Normalizer.normalize(nome == null ? "" : nome.strip(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        int ponto = semAcentos.lastIndexOf('.');
        String base = ponto > 0 ? semAcentos.substring(0, ponto) : semAcentos;
        String extensao = ponto > 0 ? limpar(semAcentos.substring(ponto + 1)).toLowerCase(Locale.ROOT) : "";

        String baseLimpa = limpar(base);
        if (baseLimpa.isEmpty()) {
            baseLimpa = NOME_PADRAO;
        }
        int limiteBase = TAMANHO_MAXIMO_NOME - (extensao.isEmpty() ? 0 : extensao.length() + 1);
        if (baseLimpa.length() > limiteBase) {
            baseLimpa = baseLimpa.substring(0, limiteBase).replaceAll("-+$", "");
        }
        return extensao.isEmpty() ? baseLimpa : baseLimpa + "." + extensao;
    }

    private static String limpar(String texto) {
        return texto.replaceAll("[^A-Za-z0-9_-]+", "-").replaceAll("-{2,}", "-").replaceAll("^-|-$", "");
    }
}
