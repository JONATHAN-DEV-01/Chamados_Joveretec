package br.com.joveretec.chamados.comum.armazenamento;

import java.time.Duration;
import java.util.Collection;
import java.util.Optional;

/**
 * Onde ficam os binários dos anexos. O backend nunca recebe o arquivo em produção: ele só
 * autoriza o envio direto do navegador, confere a chegada, gera links de download e exclui.
 * A implementação ativa é escolhida por {@code armazenamento.tipo} ({@link ArmazenamentoProdutor}).
 */
public interface ArmazenamentoArquivos {

    /** Autoriza o navegador a enviar um arquivo para {@code caminho} (sem sobrescrever). */
    AutorizacaoEnvio autorizarEnvio(String caminho, String tipoMime);

    /** Tamanho do objeto em bytes, ou vazio se ele ainda não existe. */
    Optional<Long> tamanho(String caminho);

    /**
     * Link temporário para baixar o objeto.
     *
     * @param inline {@code true} para exibir no navegador (pré-visualização de imagem);
     *               {@code false} para forçar o download com {@code nomeArquivo}
     */
    String urlDeDownload(String caminho, String nomeArquivo, boolean inline, Duration validade);

    /** Exclui os objetos; caminhos inexistentes são ignorados. */
    void excluir(Collection<String> caminhos);
}
