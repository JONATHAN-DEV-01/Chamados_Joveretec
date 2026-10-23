package br.com.joveretec.chamados.chamado.boundary;

import br.com.joveretec.chamados.chamado.boundary.AnexoDTOs.DownloadDTO;
import br.com.joveretec.chamados.chamado.boundary.FeedDTOs.AnexoDTO;
import br.com.joveretec.chamados.chamado.boundary.FeedDTOs.Leitor;
import br.com.joveretec.chamados.chamado.control.AnexoService;
import br.com.joveretec.chamados.chamado.control.AnexoService.LinkDeDownload;
import br.com.joveretec.chamados.comum.seguranca.UsuarioLogado;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;

@Path("/api/anexos")
@RolesAllowed({Perfil.ROLE_ADMIN, Perfil.ROLE_DESENVOLVEDOR})
public class AnexoResource {

    private final AnexoService anexos;
    private final UsuarioLogado usuarioLogado;

    public AnexoResource(AnexoService anexos, UsuarioLogado usuarioLogado) {
        this.anexos = anexos;
        this.usuarioLogado = usuarioLogado;
    }

    /** Passo final do envio: o backend confere o objeto no Storage e marca o anexo como CONCLUIDO. */
    @POST
    @Path("/{id}/confirmar")
    public AnexoDTO confirmar(@PathParam("id") Long id) {
        return AnexoDTO.de(anexos.confirmar(id, usuarioLogado.id()),
                new Leitor(usuarioLogado.id(), usuarioLogado.isAdmin(), false));
    }

    /** Link assinado de curta duração; {@code inline=true} para pré-visualizar imagens. */
    @GET
    @Path("/{id}/download")
    public DownloadDTO download(@PathParam("id") Long id, @QueryParam("inline") @DefaultValue("false") boolean inline) {
        LinkDeDownload link = anexos.linkDeDownload(id, inline);
        return new DownloadDTO(link.url(), link.expiraEm());
    }

    @DELETE
    @Path("/{id}")
    public void excluir(@PathParam("id") Long id) {
        anexos.excluir(id, usuarioLogado.id());
    }
}
