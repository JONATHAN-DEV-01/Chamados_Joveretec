package br.com.joveretec.chamados.usuario.boundary;

import br.com.joveretec.chamados.comum.paginacao.Pagina;
import br.com.joveretec.chamados.comum.paginacao.Paginacao;
import br.com.joveretec.chamados.comum.seguranca.UsuarioLogado;
import br.com.joveretec.chamados.usuario.boundary.UsuarioDTOs.AtualizarUsuarioRequest;
import br.com.joveretec.chamados.usuario.boundary.UsuarioDTOs.CriarUsuarioRequest;
import br.com.joveretec.chamados.usuario.control.UsuarioService;
import br.com.joveretec.chamados.usuario.entity.FiltroUsuarios;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import br.com.joveretec.chamados.usuario.entity.Usuario;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.BeanParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import jakarta.ws.rs.core.Context;

@Path("/api/usuarios")
@RolesAllowed({Perfil.ROLE_ADMIN, Perfil.ROLE_DESENVOLVEDOR})
public class UsuarioResource {

    private static final String CORPO_OBRIGATORIO = "O corpo da requisição é obrigatório.";

    private final UsuarioService usuarios;
    private final UsuarioLogado usuarioLogado;

    public UsuarioResource(UsuarioService usuarios, UsuarioLogado usuarioLogado) {
        this.usuarios = usuarios;
        this.usuarioLogado = usuarioLogado;
    }

    @GET
    public Pagina<UsuarioDTO> listar(@QueryParam("busca") String busca,
                                     @QueryParam("ativo") Boolean ativo,
                                     @QueryParam("perfil") Perfil perfil,
                                     @Valid @BeanParam Paginacao paginacao) {
        return usuarios.listar(new FiltroUsuarios(busca, ativo, perfil), paginacao).map(UsuarioDTO::de);
    }

    @GET
    @Path("/{id}")
    public UsuarioDTO buscar(@PathParam("id") Long id) {
        return UsuarioDTO.de(usuarios.buscar(id));
    }

    @POST
    @RolesAllowed(Perfil.ROLE_ADMIN)
    public Response criar(@Valid @NotNull(message = CORPO_OBRIGATORIO) CriarUsuarioRequest requisicao,
                          @Context UriInfo uriInfo) {
        Usuario criado = usuarios.criar(requisicao.nome(), requisicao.email(), requisicao.senha(), requisicao.perfil());
        return Response.created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(criado.getId())).build())
                .entity(UsuarioDTO.de(criado))
                .build();
    }

    @PUT
    @Path("/{id}")
    @RolesAllowed(Perfil.ROLE_ADMIN)
    public UsuarioDTO atualizar(@PathParam("id") Long id,
                                @Valid @NotNull(message = CORPO_OBRIGATORIO) AtualizarUsuarioRequest requisicao) {
        return UsuarioDTO.de(usuarios.atualizar(id, requisicao.nome(), requisicao.email(), requisicao.perfil(),
                requisicao.novaSenha()));
    }

    @POST
    @Path("/{id}/desativar")
    @RolesAllowed(Perfil.ROLE_ADMIN)
    public UsuarioDTO desativar(@PathParam("id") Long id) {
        return UsuarioDTO.de(usuarios.desativar(id, usuarioLogado.id()));
    }

    @POST
    @Path("/{id}/reativar")
    @RolesAllowed(Perfil.ROLE_ADMIN)
    public UsuarioDTO reativar(@PathParam("id") Long id) {
        return UsuarioDTO.de(usuarios.reativar(id));
    }
}
