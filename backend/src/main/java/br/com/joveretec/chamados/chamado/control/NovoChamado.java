package br.com.joveretec.chamados.chamado.control;

import br.com.joveretec.chamados.chamado.entity.Urgencia;

/** Dados para abrir um chamado. {@code responsavelId} e {@code posicao} são opcionais. */
public record NovoChamado(Long projetoId, String titulo, String descricao, Urgencia urgencia,
                          Long responsavelId, Integer posicao) {
}
