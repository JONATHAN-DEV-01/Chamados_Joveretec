package br.com.joveretec.chamados.chamado.control;

import br.com.joveretec.chamados.chamado.entity.Urgencia;

import java.util.Set;

/**
 * Dados para abrir um chamado. {@code responsavelIds} e {@code anexoIds} podem ser vazios;
 * {@code posicao} é opcional. {@code anexoIds} são rascunhos enviados pelo autor enquanto escrevia.
 */
public record NovoChamado(Long projetoId, String titulo, String descricao, Urgencia urgencia,
                          Set<Long> responsavelIds, Integer posicao, Set<Long> anexoIds) {
}
