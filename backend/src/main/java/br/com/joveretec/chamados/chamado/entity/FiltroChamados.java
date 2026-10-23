package br.com.joveretec.chamados.chamado.entity;

import java.util.Set;

public record FiltroChamados(
        Long projetoId,
        Long responsavelId,
        boolean semResponsavel,
        Set<StatusChamado> status,
        Set<Urgencia> urgencias,
        String busca) {

    public static FiltroChamados doProjetoEResponsavel(Long projetoId, Long responsavelId) {
        return new FiltroChamados(projetoId, responsavelId, false, Set.of(), Set.of(), null);
    }
}
