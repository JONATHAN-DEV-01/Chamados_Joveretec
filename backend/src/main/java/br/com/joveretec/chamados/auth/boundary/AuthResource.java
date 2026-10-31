package br.com.joveretec.chamados.auth.boundary;

import br.com.joveretec.chamados.auth.boundary.AuthDTOs.AlterarSenhaRequest;
import br.com.joveretec.chamados.auth.boundary.AuthDTOs.LoginRequest;
import br.com.joveretec.chamados.auth.boundary.AuthDTOs.LoginResponse;
import br.com.joveretec.chamados.auth.boundary.AuthDTOs.NovidadesVistasDTO;
import br.com.joveretec.chamados.auth.boundary.AuthDTOs.NovidadesVistasRequest;
import br.com.joveretec.chamados.auth.boundary.AuthDTOs.UsuarioLogadoDTO;
import br.com.joveretec.chamados.auth.control.AutenticacaoService;
import br.com.joveretec.chamados.comum.seguranca.UsuarioLogado;
import br.com.joveretec.chamados.configuracao.boundary.ConfiguracaoDTO.PaletaDTO;
import br.com.joveretec.chamados.usuario.control.UsuarioService;
import br.com.joveretec.chamados.usuario.entity.Perfil;
import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;

@Path("/api/auth")
public class AuthResource {

    private final AutenticacaoService autenticacao;
    private final UsuarioService usuarios;
    private final UsuarioLogado usuarioLogado;

    public AuthResource(AutenticacaoService autenticacao, UsuarioService usuarios, UsuarioLogado usuarioLogado) {
        this.autenticacao = autenticacao;
        this.usuarios = usuarios;
        this.usuarioLogado = usuarioLogado;
    }

    @POST
    @Path("/login")
    @PermitAll
    public LoginResponse login(@Valid @NotNull(message = "O corpo da requisição é obrigatório.") LoginRequest requisicao) {
        return LoginResponse.de(autenticacao.autenticar(requisicao.email(), requisicao.senha()));
    }

    @GET
    @Path("/me")
    @RolesAllowed({Perfil.ROLE_ADMIN, Perfil.ROLE_DESENVOLVEDOR})
    public UsuarioLogadoDTO me() {
        return UsuarioLogadoDTO.de(usuarios.buscarAutor(usuarioLogado.id()));
    }

    /** Paleta pessoal: vale só na sessão do próprio usuário, por cima da paleta global. */
    @PUT
    @Path("/me/paleta")
    @RolesAllowed({Perfil.ROLE_ADMIN, Perfil.ROLE_DESENVOLVEDOR})
    public PaletaDTO definirPaleta(@Valid @NotNull(message = "O corpo da requisição é obrigatório.") PaletaDTO paleta) {
        return AuthDTOs.paleta(usuarios.definirPropriaPaleta(usuarioLogado.id(), AuthDTOs.paleta(paleta)));
    }

    /** Marca as "Novidades da plataforma" como vistas até a versão informada (nunca volta atrás). */
    @PUT
    @Path("/me/novidades")
    @RolesAllowed({Perfil.ROLE_ADMIN, Perfil.ROLE_DESENVOLVEDOR})
    public NovidadesVistasDTO marcarNovidadesVistas(
            @Valid @NotNull(message = "O corpo da requisição é obrigatório.") NovidadesVistasRequest requisicao) {
        return new NovidadesVistasDTO(usuarios.marcarNovidadesVistas(usuarioLogado.id(), requisicao.versao()));
    }

    /** Volta a seguir a paleta global do sistema. */
    @DELETE
    @Path("/me/paleta")
    @RolesAllowed({Perfil.ROLE_ADMIN, Perfil.ROLE_DESENVOLVEDOR})
    public void removerPaleta() {
        usuarios.removerPropriaPaleta(usuarioLogado.id());
    }

    @PUT
    @Path("/me/senha")
    @RolesAllowed({Perfil.ROLE_ADMIN, Perfil.ROLE_DESENVOLVEDOR})
    public void alterarSenha(@Valid @NotNull(message = "O corpo da requisição é obrigatório.") AlterarSenhaRequest requisicao) {
        usuarios.alterarPropriaSenha(usuarioLogado.id(), requisicao.senhaAtual(), requisicao.novaSenha());
    }
}
