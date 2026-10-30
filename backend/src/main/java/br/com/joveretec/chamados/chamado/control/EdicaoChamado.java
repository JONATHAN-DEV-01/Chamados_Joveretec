package br.com.joveretec.chamados.chamado.control;

import br.com.joveretec.chamados.chamado.entity.Urgencia;

import java.util.Set;

/** Dados editáveis de um chamado; {@code versao} é a versão que o cliente leu (lock otimista). */
public record EdicaoChamado(String titulo, String descricao, Urgencia urgencia, Set<Long> responsavelIds,
                            long versao) {
}
