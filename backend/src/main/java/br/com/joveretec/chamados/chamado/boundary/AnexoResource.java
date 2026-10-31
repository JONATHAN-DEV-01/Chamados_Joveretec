package br.com.joveretec.chamados.chamado.boundary;

import br.com.joveretec.chamados.chamado.boundary.AnexoDTOs.DownloadDTO;
import br.com.joveretec.chamados.chamado.boundary.AnexoDTOs.EnvioAutorizadoDTO;
import br.com.joveretec.chamados.chamado.boundary.AnexoDTOs.EnvioDTO;
import br.com.joveretec.chamados.chamado.boundary.AnexoDTOs.LinkDTO;
import br.com.joveretec.chamados.chamado.boundary.AnexoDTOs.SolicitarEnvioRequest;
import br.com.joveretec.chamados.chamado.boundary.FeedDTOs.AnexoDTO;
import br.com.joveretec.chamados.chamado.boundary.FeedDTOs.Leitor;
import br.com.joveretec.chamados.chamado.control.AnexoService;
import br.com.joveretec.chamados.chamado.control.AnexoService.EnvioAutorizado;
import br.com.joveretec.chamados.chamado.control.AnexoService.LinkDeDownload;
import br.com.joveretec.chamados.comum.erro.ExcecaoDeNegocio;
import br.com.joveretec.chamados.comum.seguranca.UsuarioLogado;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Response;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Path("/api/anexos")
@RolesAllowed({Perfil.ROLE_ADMIN, Perfil.ROLE_DESENVOLVEDOR})
public class AnexoResource {

    private static final int MAXIMO_LINKS = 50;

    private final AnexoService anexos;
    private final UsuarioLogado usuarioLogado;

    public AnexoResource(AnexoService anexos, UsuarioLogado usuarioLogado) {
        this.anexos = anexos;
        this.usuarioLogado = usuarioLogado;
    }

    /**
     * Passo 1 do envio para um chamado que ainda está sendo escrito (colar ou arrastar na descrição):
     * o anexo nasce sem chamado e é ligado a ele na criação ({@code anexoIds}).
     */
    @POST
    @Path("/rascunhos")
    public Response solicitarRascunho(@Valid @NotNull(message = "O corpo da requisição é obrigatório.")
                                      SolicitarEnvioRequest requisicao) {
        EnvioAutorizado autorizado = anexos.solicitarEnvioDeRascunho(requisicao.paraPedido(), usuarioLogado.id());
        return Response.status(Response.Status.CREATED)
                .entity(new EnvioAutorizadoDTO(AnexoDTO.de(autorizado.anexo(), leitor()),
                        EnvioDTO.de(autorizado.autorizacao())))
                .build();
    }

    /** Passo final do envio: o backend confere o objeto no Storage e marca o anexo como CONCLUIDO. */
    @POST
    @Path("/{id}/confirmar")
    public AnexoDTO confirmar(@PathParam("id") Long id) {
        return AnexoDTO.de(anexos.confirmar(id, usuarioLogado.id()), leitor());
    }

    /** Link assinado de curta duração; {@code inline=true} para pré-visualizar imagens. */
    @GET
    @Path("/{id}/download")
    public DownloadDTO download(@PathParam("id") Long id, @QueryParam("inline") @DefaultValue("false") boolean inline) {
        LinkDeDownload link = anexos.linkDeDownload(id, inline, usuarioLogado.id());
        return new DownloadDTO(link.url(), link.expiraEm());
    }

    /**
     * Links de vários anexos numa chamada só (miniaturas dentro do texto). Aceita
     * {@code ?ids=1&ids=2} ou {@code ?ids=1,2}; ids sem acesso são ignorados.
     */
    @GET
    @Path("/links")
    public List<LinkDTO> links(@QueryParam("ids") List<String> ids,
                               @QueryParam("inline") @DefaultValue("false") boolean inline) {
        return anexos.linksDeDownload(lerIds(ids), inline, usuarioLogado.id()).stream().map(LinkDTO::de).toList();
    }

    @DELETE
    @Path("/{id}")
    public void excluir(@PathParam("id") Long id) {
        anexos.excluir(id, usuarioLogado.id());
    }

    private Leitor leitor() {
        return new Leitor(usuarioLogado.id(), usuarioLogado.isAdmin(), false);
    }

    private static Set<Long> lerIds(List<String> valores) {
        Set<Long> ids = new LinkedHashSet<>();
        if (valores != null) {
            for (String valor : valores.stream().flatMap(v -> Arrays.stream(v.split(","))).map(String::trim)
                    .filter(v -> !v.isEmpty()).toList()) {
                try {
                    ids.add(Long.parseLong(valor));
                } catch (NumberFormatException e) {
                    throw ExcecaoDeNegocio.validacao("Valor inválido para 'ids': " + valor + ".");
                }
            }
        }
        if (ids.size() > MAXIMO_LINKS) {
            throw ExcecaoDeNegocio.validacao("No máximo " + MAXIMO_LINKS + " anexos por pedido.");
        }
        return ids;
    }
}
