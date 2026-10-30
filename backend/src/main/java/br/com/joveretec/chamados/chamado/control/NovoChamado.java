package br.com.joveretec.chamados.chamado.control;

import br.com.joveretec.chamados.chamado.entity.Urgencia;

import java.util.Set;

/** Dados para abrir um chamado. {@code responsavelIds} pode ser vazio; {@code posicao} é opcional. */
public record NovoChamado(Long projetoId, String titulo, String descricao, Urgencia urgencia,
                          Set<Long> responsavelIds, Integer posicao) {
}
