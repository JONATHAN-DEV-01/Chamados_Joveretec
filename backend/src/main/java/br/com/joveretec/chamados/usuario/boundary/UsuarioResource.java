package br.com.joveretec.chamados.usuario.boundary;

import br.com.joveretec.chamados.comum.paginacao.Pagina;
import br.com.joveretec.chamados.comum.paginacao.Paginacao;
import br.com.joveretec.chamados.comum.paginacao.ParametrosEnum;
import br.com.joveretec.chamados.comum.seguranca.UsuarioLogado;
import br.com.joveretec.chamados.usuario.boundary.UsuarioDTOs.AtualizarUsuarioRequest;
import br.com.joveretec.chamados.usuario.boundary.UsuarioDTOs.CriarUsuarioRequest;
import br.com.joveretec.chamados.usuario.control.UsuarioService;
import br.com.joveretec.chamados.usuario.entity.FiltroUsuarios;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import io.quarkus.cache.Cache;
import io.quarkus.cache.CacheName;
import io.quarkus.cache.CacheResult;
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

    static final String CACHE = "usuarios-lista";

    private static final String CORPO_OBRIGATORIO = "O corpo da requisição é obrigatório.";

    private final UsuarioService usuarios;
    private final UsuarioLogado usuarioLogado;
    private final Cache cache;

    public UsuarioResource(UsuarioService usuarios, UsuarioLogado usuarioLogado, @CacheName(CACHE) Cache cache) {
        this.usuarios = usuarios;
        this.usuarioLogado = usuarioLogado;
        this.cache = cache;
    }

    /** Lida em quase toda tela (escolha de responsáveis): cache curto, limpo a cada alteração. */
    @GET
    @CacheResult(cacheName = CACHE)
    public Pagina<UsuarioDTO> listar(@QueryParam("busca") String busca,
                                     @QueryParam("ativo") Boolean ativo,
                                     @QueryParam("perfil") String perfil,
                                     @Valid @BeanParam Paginacao paginacao) {
        FiltroUsuarios filtro = new FiltroUsuarios(busca, ativo, ParametrosEnum.valor(perfil, Perfil.class, "perfil"));
        return usuarios.listar(filtro, paginacao).map(UsuarioDTO::de);
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
        limparCache();
        return Response.created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(criado.getId())).build())
                .entity(UsuarioDTO.de(criado))
                .build();
    }

    @PUT
    @Path("/{id}")
    @RolesAllowed(Perfil.ROLE_ADMIN)
    public UsuarioDTO atualizar(@PathParam("id") Long id,
                                @Valid @NotNull(message = CORPO_OBRIGATORIO) AtualizarUsuarioRequest requisicao) {
        return limparCache(UsuarioDTO.de(usuarios.atualizar(id, requisicao.nome(), requisicao.email(),
                requisicao.perfil(), requisicao.novaSenha())));
    }

    @POST
    @Path("/{id}/desativar")
    @RolesAllowed(Perfil.ROLE_ADMIN)
    public UsuarioDTO desativar(@PathParam("id") Long id) {
        return limparCache(UsuarioDTO.de(usuarios.desativar(id, usuarioLogado.id())));
    }

    @POST
    @Path("/{id}/reativar")
    @RolesAllowed(Perfil.ROLE_ADMIN)
    public UsuarioDTO reativar(@PathParam("id") Long id) {
        return limparCache(UsuarioDTO.de(usuarios.reativar(id)));
    }

    /** Depois do commit (a transação é do serviço), para nenhuma leitura recachear o valor antigo. */
    private <T> T limparCache(T resultado) {
        limparCache();
        return resultado;
    }

    private void limparCache() {
        cache.invalidateAll().await().indefinitely();
    }
}
