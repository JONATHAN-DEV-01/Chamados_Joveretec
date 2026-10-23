package br.com.joveretec.chamados.projeto.boundary;

import br.com.joveretec.chamados.comum.paginacao.Pagina;
import br.com.joveretec.chamados.comum.paginacao.Paginacao;
import br.com.joveretec.chamados.projeto.boundary.ProjetoDTOs.ProjetoDTO;
import br.com.joveretec.chamados.projeto.boundary.ProjetoDTOs.SalvarProjetoRequest;
import br.com.joveretec.chamados.projeto.control.ProjetoService;
import br.com.joveretec.chamados.projeto.entity.Projeto;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.BeanParam;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;

@Path("/api/projetos")
@RolesAllowed({Perfil.ROLE_ADMIN, Perfil.ROLE_DESENVOLVEDOR})
public class ProjetoResource {

    private static final String CORPO_OBRIGATORIO = "O corpo da requisição é obrigatório.";

    private final ProjetoService projetos;

    public ProjetoResource(ProjetoService projetos) {
        this.projetos = projetos;
    }

    @GET
    public Pagina<ProjetoDTO> listar(@QueryParam("busca") String busca,
                                     @QueryParam("incluirArquivados") @DefaultValue("false") boolean incluirArquivados,
                                     @Valid @BeanParam Paginacao paginacao) {
        return projetos.listar(busca, incluirArquivados, paginacao).map(ProjetoDTO::de);
    }

    @GET
    @Path("/{id}")
    public ProjetoDTO buscar(@PathParam("id") Long id) {
        return ProjetoDTO.de(projetos.buscar(id));
    }

    @POST
    @RolesAllowed(Perfil.ROLE_ADMIN)
    public Response criar(@Valid @NotNull(message = CORPO_OBRIGATORIO) SalvarProjetoRequest requisicao,
                          @Context UriInfo uriInfo) {
        Projeto criado = projetos.criar(requisicao.nome(), requisicao.descricao());
        return Response.created(uriInfo.getAbsolutePathBuilder().path(String.valueOf(criado.getId())).build())
                .entity(ProjetoDTO.de(criado))
                .build();
    }

    @PUT
    @Path("/{id}")
    @RolesAllowed(Perfil.ROLE_ADMIN)
    public ProjetoDTO atualizar(@PathParam("id") Long id,
                                @Valid @NotNull(message = CORPO_OBRIGATORIO) SalvarProjetoRequest requisicao) {
        return ProjetoDTO.de(projetos.atualizar(id, requisicao.nome(), requisicao.descricao()));
    }

    @POST
    @Path("/{id}/arquivar")
    @RolesAllowed(Perfil.ROLE_ADMIN)
    public ProjetoDTO arquivar(@PathParam("id") Long id) {
        return ProjetoDTO.de(projetos.arquivar(id));
    }

    @POST
    @Path("/{id}/desarquivar")
    @RolesAllowed(Perfil.ROLE_ADMIN)
    public ProjetoDTO desarquivar(@PathParam("id") Long id) {
        return ProjetoDTO.de(projetos.desarquivar(id));
    }
}
