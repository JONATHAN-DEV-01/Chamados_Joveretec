package br.com.joveretec.chamados.comum.armazenamento;

/** Falha transitória ao falar com o armazenamento (rede, timeout, 5xx): pode ser repetida. */
public class FalhaNoArmazenamento extends RuntimeException {

    public FalhaNoArmazenamento(String mensagem) {
        super(mensagem);
    }

    public FalhaNoArmazenamento(String mensagem, Throwable causa) {
        super(mensagem, causa);
    }

    /** Recusa definitiva (4xx: bucket inexistente, chave inválida...): não adianta repetir. */
    public static class Recusa extends FalhaNoArmazenamento {
        public Recusa(String mensagem) {
            super(mensagem);
        }
    }
}
