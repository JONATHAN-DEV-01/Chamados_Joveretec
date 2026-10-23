package br.com.joveretec.chamados.comum.armazenamento;

import java.util.Map;

/**
 * O que o navegador precisa para enviar o arquivo direto ao armazenamento.
 *
 * @param protocolo   TUS (upload resumível, Supabase) ou PUT (envio simples, armazenamento local)
 * @param url         endpoint de envio; relativo (começando com /api) quando for o próprio backend
 * @param cabecalhos  cabeçalhos HTTP obrigatórios no envio (ex.: assinatura do upload)
 * @param metadados   metadados do protocolo TUS (bucket, caminho, tipo)
 * @param tamanhoParte tamanho de cada parte no TUS, em bytes (0 quando não se aplica)
 */
public record AutorizacaoEnvio(Protocolo protocolo, String url, Map<String, String> cabecalhos,
                               Map<String, String> metadados, long tamanhoParte) {

    public enum Protocolo {
        TUS,
        PUT
    }
}
