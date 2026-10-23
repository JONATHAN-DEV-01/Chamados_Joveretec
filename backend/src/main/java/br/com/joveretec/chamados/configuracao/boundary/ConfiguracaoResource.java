package br.com.joveretec.chamados.configuracao.boundary;

import br.com.joveretec.chamados.comum.seguranca.UsuarioLogado;
import br.com.joveretec.chamados.configuracao.control.ConfiguracaoService;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;

@Path("/api/configuracoes")
public class ConfiguracaoResource {

    private final ConfiguracaoService configuracoes;
    private final UsuarioLogado usuarioLogado;

    public ConfiguracaoResource(ConfiguracaoService configuracoes, UsuarioLogado usuarioLogado) {
        this.configuracoes = configuracoes;
        this.usuarioLogado = usuarioLogado;
    }

    @GET
    @PermitAll
    public ConfiguracaoDTO obter() {
        return ConfiguracaoDTO.de(configuracoes.obter());
    }

    @PUT
    @RolesAllowed(Perfil.ROLE_ADMIN)
    public ConfiguracaoDTO atualizar(@Valid @NotNull(message = "O corpo da requisição é obrigatório.")
                                     ConfiguracaoDTO requisicao) {
        return ConfiguracaoDTO.de(configuracoes.atualizar(requisicao.paraConfiguracoes(), usuarioLogado.id()));
    }
}
