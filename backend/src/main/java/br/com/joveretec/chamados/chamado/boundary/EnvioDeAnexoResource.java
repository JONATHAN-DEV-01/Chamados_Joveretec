package br.com.joveretec.chamados.chamado.boundary;

import br.com.joveretec.chamados.chamado.boundary.AnexoDTOs.EnvioAutorizadoDTO;
import br.com.joveretec.chamados.chamado.boundary.AnexoDTOs.EnvioDTO;
import br.com.joveretec.chamados.chamado.boundary.AnexoDTOs.SolicitarEnvioRequest;
import br.com.joveretec.chamados.chamado.boundary.FeedDTOs.AnexoDTO;
import br.com.joveretec.chamados.chamado.boundary.FeedDTOs.Leitor;
import br.com.joveretec.chamados.chamado.control.AnexoService;
import br.com.joveretec.chamados.chamado.control.AnexoService.EnvioAutorizado;
import br.com.joveretec.chamados.comum.seguranca.UsuarioLogado;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Response;

/** Passo 1 do envio: o backend registra o anexo (PENDENTE) e autoriza o upload direto ao Storage. */
@Path("/api/chamados/{chamadoId}/anexos")
@RolesAllowed({Perfil.ROLE_ADMIN, Perfil.ROLE_DESENVOLVEDOR})
public class EnvioDeAnexoResource {

    private final AnexoService anexos;
    private final UsuarioLogado usuarioLogado;

    public EnvioDeAnexoResource(AnexoService anexos, UsuarioLogado usuarioLogado) {
        this.anexos = anexos;
        this.usuarioLogado = usuarioLogado;
    }

    @POST
    public Response solicitar(@PathParam("chamadoId") Long chamadoId,
                              @Valid @NotNull(message = "O corpo da requisição é obrigatório.")
                              SolicitarEnvioRequest requisicao) {
        EnvioAutorizado autorizado = anexos.solicitarEnvio(chamadoId, requisicao.paraPedido(), usuarioLogado.id());
        Leitor leitor = new Leitor(usuarioLogado.id(), usuarioLogado.isAdmin(), false);
        return Response.status(Response.Status.CREATED)
                .entity(new EnvioAutorizadoDTO(AnexoDTO.de(autorizado.anexo(), leitor), EnvioDTO.de(autorizado.autorizacao())))
                .build();
    }
}
