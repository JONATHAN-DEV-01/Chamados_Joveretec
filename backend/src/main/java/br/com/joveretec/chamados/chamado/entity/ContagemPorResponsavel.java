package br.com.joveretec.chamados.chamado.entity;

public record ContagemPorResponsavel(Long responsavelId, String responsavelNome, StatusChamado status, Long total) {
}
