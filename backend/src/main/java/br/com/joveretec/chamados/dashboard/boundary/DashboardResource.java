package br.com.joveretec.chamados.dashboard.boundary;

import br.com.joveretec.chamados.comum.seguranca.UsuarioLogado;
import br.com.joveretec.chamados.dashboard.boundary.DashboardDTOs.MeusChamadosDTO;
import br.com.joveretec.chamados.dashboard.boundary.DashboardDTOs.TotalPorDesenvolvedorDTO;
import br.com.joveretec.chamados.dashboard.boundary.DashboardDTOs.TotalPorStatusDTO;
import br.com.joveretec.chamados.dashboard.boundary.DashboardDTOs.TotalPorUrgenciaDTO;
import br.com.joveretec.chamados.dashboard.boundary.DashboardDTOs.UltimaAtualizacaoDTO;
import br.com.joveretec.chamados.dashboard.control.DashboardService;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;

import java.util.List;

@Path("/api/dashboard")
@RolesAllowed({Perfil.ROLE_ADMIN, Perfil.ROLE_DESENVOLVEDOR})
public class DashboardResource {

    private final DashboardService dashboard;
    private final UsuarioLogado usuarioLogado;

    public DashboardResource(DashboardService dashboard, UsuarioLogado usuarioLogado) {
        this.dashboard = dashboard;
        this.usuarioLogado = usuarioLogado;
    }

    @GET
    @Path("/por-status")
    public List<TotalPorStatusDTO> porStatus(@QueryParam("projetoId") Long projetoId) {
        return TotalPorStatusDTO.de(dashboard.porStatus(projetoId));
    }

    @GET
    @Path("/por-urgencia")
    public List<TotalPorUrgenciaDTO> porUrgencia(@QueryParam("projetoId") Long projetoId) {
        return TotalPorUrgenciaDTO.de(dashboard.porUrgencia(projetoId));
    }

    @GET
    @Path("/por-desenvolvedor")
    public List<TotalPorDesenvolvedorDTO> porDesenvolvedor(@QueryParam("projetoId") Long projetoId) {
        return dashboard.porDesenvolvedor(projetoId).stream().map(TotalPorDesenvolvedorDTO::de).toList();
    }

    @GET
    @Path("/ultimas-atualizacoes")
    public List<UltimaAtualizacaoDTO> ultimasAtualizacoes(
            @QueryParam("limite") @DefaultValue("10")
            @Min(value = 1, message = "O limite deve ser no mínimo 1.")
            @Max(value = 50, message = "O limite deve ser no máximo 50.") int limite) {
        return dashboard.ultimasAtualizacoes(usuarioLogado.id(), limite).stream().map(UltimaAtualizacaoDTO::de).toList();
    }

    @GET
    @Path("/meus-chamados")
    public MeusChamadosDTO meusChamados(@QueryParam("projetoId") Long projetoId) {
        return MeusChamadosDTO.de(dashboard.meusChamados(usuarioLogado.id(), projetoId));
    }
}
