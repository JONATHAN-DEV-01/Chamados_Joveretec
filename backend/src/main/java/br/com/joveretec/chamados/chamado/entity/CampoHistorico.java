package br.com.joveretec.chamados.chamado.entity;

public enum CampoHistorico {
    CRIACAO,
    TITULO,
    DESCRICAO,
    URGENCIA,
    STATUS,
    /** Responsável único (antes da V4); continua no histórico antigo. */
    RESPONSAVEL,
    RESPONSAVEL_ADICIONADO,
    RESPONSAVEL_REMOVIDO,
    POSICAO,
    ANEXO_ADICIONADO,
    ANEXO_REMOVIDO
}
