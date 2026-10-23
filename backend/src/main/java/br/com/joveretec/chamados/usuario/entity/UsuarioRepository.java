package br.com.joveretec.chamados.usuario.entity;

import br.com.joveretec.chamados.comum.paginacao.CondicoesConsulta;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class UsuarioRepository implements PanacheRepository<Usuario> {

    public Optional<Usuario> buscarPorEmail(String email) {
        return find("lower(email) = ?1", Usuario.normalizarEmail(email)).firstResultOptional();
    }

    public boolean emailEmUso(String email, Long ignorarId) {
        CondicoesConsulta condicoes = new CondicoesConsulta()
                .igual("lower(email) = :email", "email", Usuario.normalizarEmail(email))
                .igual("id <> :id", "id", ignorarId);
        return count(condicoes.where(), condicoes.parametros()) > 0;
    }

    public long contarAdminsAtivos() {
        return count("perfil = ?1 and ativo = true", Perfil.ADMIN);
    }

    public PanacheQuery<Usuario> listar(FiltroUsuarios filtro) {
        CondicoesConsulta condicoes = new CondicoesConsulta()
                .contem("(lower(nome) like :busca or lower(email) like :busca)", "busca", filtro.busca())
                .igual("ativo = :ativo", "ativo", filtro.ativo())
                .igual("perfil = :perfil", "perfil", filtro.perfil());
        return find(condicoes.where(), Sort.by("nome").and("id"), condicoes.parametros());
    }
}
