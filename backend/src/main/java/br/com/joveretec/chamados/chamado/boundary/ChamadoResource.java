package br.com.joveretec.chamados.chamado.boundary;

import br.com.joveretec.chamados.chamado.boundary.ChamadoDTOs.AlterarStatusRequest;
import br.com.joveretec.chamados.chamado.boundary.ChamadoDTOs.AtualizarChamadoRequest;
import br.com.joveretec.chamados.chamado.boundary.ChamadoDTOs.ChamadoDTO;
import br.com.joveretec.chamados.chamado.boundary.ChamadoDTOs.ChamadoResumoDTO;
import br.com.joveretec.chamados.chamado.boundary.ChamadoDTOs.CriarChamadoRequest;
import br.com.joveretec.chamados.chamado.boundary.ChamadoDTOs.HistoricoDTO;
import br.com.joveretec.chamados.chamado.boundary.ChamadoDTOs.ReordenarRequest;
import br.com.joveretec.chamados.chamado.control.ChamadoService;
import br.com.joveretec.chamados.chamado.entity.Chamado;
import br.com.joveretec.chamados.chamado.entity.FiltroChamados;
import br.com.joveretec.chamados.chamado.entity.StatusChamado;
import br.com.joveretec.chamados.chamado.entity.Urgencia;
import br.com.joveretec.chamados.comum.paginacao.Pagina;
import br.com.joveretec.chamados.comum.paginacao.Paginacao;
import br.com.joveretec.chamados.comum.paginacao.ParametrosEnum;
import br.com.joveretec.chamados.comum.seguranca.UsuarioLogado;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.BeanParam;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;

import java.util.List;

@Path("/api/chamados")
@RolesAllowed({Perfil.ROLE_ADMIN, Perfil.ROLE_DESENVOLVEDOR})
public class ChamadoResource {

    private static final String CORPO_OBRIGATORIO = "O corpo da requisição é obrigatório.";

    private final ChamadoService chamados;
    private final UsuarioLogado usuarioLogado;

    public ChamadoResource(ChamadoService chamados, UsuarioLogado usuarioLogado) {
        this.chamados = chamados;
        this.usuarioLogado = usuarioLogado;
    }

    @GET
    public Pagina<ChamadoResumoDTO> listar(@QueryParam("projetoId") Long projetoId,
                                           @QueryParam("responsavelId") Long responsavelId,
                                           @QueryParam("semResponsavel") @DefaultValue("false") boolean semResponsavel,
                                           @QueryParam("status") List<String> status,
                                           @QueryParam("urgencia") List<String> urgencias,
                                           @QueryParam("busca") String busca,
                                           @Valid @BeanParam Paginacao paginacao) {
        FiltroChamados filtro = new FiltroChamados(projetoId, responsavelId, semResponsavel,
                ParametrosEnum.conjunto(status, StatusChamado.class, "status"),
                ParametrosEnum.conjunto(urgencias, Urgencia.class, "urgencia"),
                busca);
        return chamados.listar(filtro, paginacao).map(ChamadoResumoDTO::de);
    }

    @GET
    @Path("/{id}")
    public ChamadoDTO buscar(@PathParam("id") Long id) {
        return ChamadoDTO.de(chamados.buscar(id));
    }

    @POST
    public Response criar(@Valid @NotNull(message = CORPO_OBRIGATORIO) CriarChamadoRequest requisicao,
                          @Context UriInfo uriInfo) {
        Chamado criado = chamados.criar(requisicao.paraComando(), usuarioLogado.id());
        return Response.created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(criado.getId())).build())
                .entity(ChamadoDTO.de(criado))
                .build();
    }

    @PUT
    @Path("/{id}")
    public ChamadoDTO editar(@PathParam("id") Long id,
                             @Valid @NotNull(message = CORPO_OBRIGATORIO) AtualizarChamadoRequest requisicao) {
        return ChamadoDTO.de(chamados.editar(id, requisicao.paraComando(), usuarioLogado.id()));
    }

    @PATCH
    @Path("/{id}/status")
    public ChamadoDTO alterarStatus(@PathParam("id") Long id,
                                    @Valid @NotNull(message = CORPO_OBRIGATORIO) AlterarStatusRequest requisicao) {
        return ChamadoDTO.de(chamados.alterarStatus(id, requisicao.status(), usuarioLogado.id()));
    }

    @POST
    @Path("/{id}/atribuir-a-mim")
    public ChamadoDTO atribuirAMim(@PathParam("id") Long id) {
        return ChamadoDTO.de(chamados.atribuirAoAutor(id, usuarioLogado.id()));
    }

    @PUT
    @Path("/{id}/posicao")
    public ChamadoDTO reordenar(@PathParam("id") Long id,
                                @Valid @NotNull(message = CORPO_OBRIGATORIO) ReordenarRequest requisicao) {
        return ChamadoDTO.de(chamados.reordenar(id, requisicao.posicao(), usuarioLogado.id()));
    }

    @GET
    @Path("/{id}/historico")
    public Pagina<HistoricoDTO> historico(@PathParam("id") Long id, @Valid @BeanParam Paginacao paginacao) {
        return chamados.historico(id, paginacao).map(HistoricoDTO::de);
    }
}
