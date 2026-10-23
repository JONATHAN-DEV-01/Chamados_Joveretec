package br.com.joveretec.chamados.chamado.boundary;

import br.com.joveretec.chamados.chamado.boundary.FeedDTOs.AcompanhamentoDTO;
import br.com.joveretec.chamados.chamado.boundary.FeedDTOs.CriarAcompanhamentoRequest;
import br.com.joveretec.chamados.chamado.boundary.FeedDTOs.Leitor;
import br.com.joveretec.chamados.chamado.boundary.FeedDTOs.RascunhoDTO;
import br.com.joveretec.chamados.chamado.boundary.FeedDTOs.SalvarAcompanhamentoRequest;
import br.com.joveretec.chamados.chamado.control.AcompanhamentoService;
import br.com.joveretec.chamados.chamado.control.AcompanhamentoService.ComAnexos;
import br.com.joveretec.chamados.comum.seguranca.UsuarioLogado;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;

@Path("/api/chamados/{chamadoId}/acompanhamentos")
@RolesAllowed({Perfil.ROLE_ADMIN, Perfil.ROLE_DESENVOLVEDOR})
public class AcompanhamentoResource {

    private static final String CORPO_OBRIGATORIO = "O corpo da requisição é obrigatório.";

    private final AcompanhamentoService acompanhamentos;
    private final UsuarioLogado usuarioLogado;

    public AcompanhamentoResource(AcompanhamentoService acompanhamentos, UsuarioLogado usuarioLogado) {
        this.acompanhamentos = acompanhamentos;
        this.usuarioLogado = usuarioLogado;
    }

    /** Publica um acompanhamento (com {@code rascunhoId} quando já há anexos enviados). */
    @POST
    public Response publicar(@PathParam("chamadoId") Long chamadoId,
                             @Valid @NotNull(message = CORPO_OBRIGATORIO) CriarAcompanhamentoRequest requisicao,
                             @Context UriInfo uriInfo) {
        ComAnexos publicado = acompanhamentos.publicar(chamadoId, requisicao.paraComando(), usuarioLogado.id());
        return Response.created(uriInfo.getAbsolutePathBuilder()
                        .path(String.valueOf(publicado.acompanhamento().getId())).build())
                .entity(paraDto(publicado))
                .build();
    }

    /** Rascunho para receber anexos antes de publicar. */
    @POST
    @Path("/rascunhos")
    public Response criarRascunho(@PathParam("chamadoId") Long chamadoId) {
        Long id = acompanhamentos.criarRascunho(chamadoId, usuarioLogado.id()).getId();
        return Response.status(Response.Status.CREATED).entity(new RascunhoDTO(id)).build();
    }

    @PUT
    @Path("/{id}")
    public AcompanhamentoDTO editar(@PathParam("chamadoId") Long chamadoId, @PathParam("id") Long id,
                                    @Valid @NotNull(message = CORPO_OBRIGATORIO) SalvarAcompanhamentoRequest requisicao) {
        return paraDto(acompanhamentos.editar(chamadoId, id, requisicao.paraDados(), usuarioLogado.id()));
    }

    @DELETE
    @Path("/{id}")
    public void excluir(@PathParam("chamadoId") Long chamadoId, @PathParam("id") Long id) {
        acompanhamentos.excluir(chamadoId, id, usuarioLogado.id());
    }

    private AcompanhamentoDTO paraDto(ComAnexos item) {
        // Só se altera acompanhamento em projeto ativo (validado no serviço).
        return AcompanhamentoDTO.de(item, new Leitor(usuarioLogado.id(), usuarioLogado.isAdmin(), false));
    }
}
