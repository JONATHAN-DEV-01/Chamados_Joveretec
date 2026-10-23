package br.com.joveretec.chamados.chamado.boundary;

import br.com.joveretec.chamados.chamado.boundary.FeedDTOs.ItemFeedDTO;
import br.com.joveretec.chamados.chamado.boundary.FeedDTOs.Leitor;
import br.com.joveretec.chamados.chamado.control.FeedService;
import br.com.joveretec.chamados.chamado.control.FeedService.Feed;
import br.com.joveretec.chamados.chamado.entity.FeedRepository.Ordem;
import br.com.joveretec.chamados.comum.paginacao.Pagina;
import br.com.joveretec.chamados.comum.paginacao.Paginacao;
import br.com.joveretec.chamados.comum.paginacao.ParametrosEnum;
import br.com.joveretec.chamados.comum.seguranca.UsuarioLogado;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.BeanParam;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;

@Path("/api/chamados/{chamadoId}/feed")
@RolesAllowed({Perfil.ROLE_ADMIN, Perfil.ROLE_DESENVOLVEDOR})
public class FeedResource {

    private final FeedService feed;
    private final UsuarioLogado usuarioLogado;

    public FeedResource(FeedService feed, UsuarioLogado usuarioLogado) {
        this.feed = feed;
        this.usuarioLogado = usuarioLogado;
    }

    /** Linha do tempo: abertura, acompanhamentos e eventos, por data ({@code ordem} ASC ou DESC). */
    @GET
    public Pagina<ItemFeedDTO> listar(@PathParam("chamadoId") Long chamadoId,
                                      @QueryParam("ordem") @DefaultValue("ASC") String ordem,
                                      @Valid @BeanParam Paginacao paginacao) {
        Feed resultado = feed.listar(chamadoId, ParametrosEnum.valor(ordem, Ordem.class, "ordem"), paginacao);
        Leitor leitor = Leitor.de(usuarioLogado, resultado.chamado());
        return resultado.pagina().map(item -> ItemFeedDTO.de(item, leitor));
    }
}
