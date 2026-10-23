package br.com.joveretec.chamados.chamado;

import br.com.joveretec.chamados.chamado.control.CaminhoDoAnexo;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CaminhoDoAnexoTest {

    @Test
    void pastaDaAberturaEDeAcompanhamento() {
        assertEquals("projetos/3/chamados/10/abertura/", CaminhoDoAnexo.pasta(3L, 10L, null));
        assertEquals("projetos/3/chamados/10/acompanhamentos/7/", CaminhoDoAnexo.pasta(3L, 10L, 7L));
    }

    @Test
    void caminhoCompletoUsaIdENomeSanitizado() {
        String pasta = CaminhoDoAnexo.pasta(3L, 10L, 7L);
        assertEquals("projetos/3/chamados/10/acompanhamentos/7/42-Relatorio-Final-v2.pdf",
                CaminhoDoAnexo.arquivo(pasta, 42L, "Relatório Final (v2).PDF"));
    }

    @Test
    void removeAcentosEspacosECaracteresEspeciais() {
        assertEquals("Acao-de-Manutencao-Sao-Paulo.xlsx", CaminhoDoAnexo.sanitizar("  Ação de Manutenção — São Paulo.xlsx "));
        assertEquals("foto_01.jpeg", CaminhoDoAnexo.sanitizar("foto_01.JPEG"));
        assertEquals("passwd", CaminhoDoAnexo.sanitizar("../../etc/passwd"));
    }

    @Test
    void nomeVazioOuSoComSimbolosViraArquivo() {
        assertEquals("arquivo", CaminhoDoAnexo.sanitizar("???"));
        assertEquals("arquivo.txt", CaminhoDoAnexo.sanitizar("@@@.txt"));
        assertEquals("arquivo", CaminhoDoAnexo.sanitizar(null));
        // Ponto inicial não é extensão.
        assertEquals("bashrc", CaminhoDoAnexo.sanitizar(".bashrc"));
    }

    @Test
    void limitaOTamanhoPreservandoAExtensao() {
        String nome = CaminhoDoAnexo.sanitizar("a".repeat(500) + ".pdf");
        assertTrue(nome.length() <= 120, "nome com " + nome.length() + " caracteres");
        assertTrue(nome.endsWith(".pdf"));
    }
}
