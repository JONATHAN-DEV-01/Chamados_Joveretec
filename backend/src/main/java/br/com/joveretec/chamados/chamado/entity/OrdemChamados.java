package br.com.joveretec.chamados.chamado.entity;

public enum OrdemChamados {
    /** Padrão da listagem: urgência (maior primeiro) e depois posição na fila. */
    URGENCIA(" order by c.urgenciaPeso desc, c.posicao, c.id"),
    /** Somente a posição na fila (tela de reordenação do projeto). */
    POSICAO(" order by c.posicao, c.id");

    private final String orderBy;

    OrdemChamados(String orderBy) {
        this.orderBy = orderBy;
    }

    String orderBy() {
        return orderBy;
    }
}
