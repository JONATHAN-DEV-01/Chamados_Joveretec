package br.com.joveretec.chamados.projeto.entity;

import br.com.joveretec.chamados.comum.paginacao.CondicoesConsulta;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;

import java.util.Optional;

@ApplicationScoped
public class ProjetoRepository implements PanacheRepository<Projeto> {

    public boolean nomeEmUso(String nome, Long ignorarId) {
        CondicoesConsulta condicoes = new CondicoesConsulta()
                .igual("lower(nome) = :nome", "nome", nome.trim().toLowerCase())
                .igual("id <> :id", "id", ignorarId);
        return count(condicoes.where(), condicoes.parametros()) > 0;
    }

    /** Bloqueia o projeto até o fim da transação, serializando alterações na fila de chamados. */
    public Optional<Projeto> buscarComBloqueio(Long id) {
        return findByIdOptional(id, LockModeType.PESSIMISTIC_WRITE);
    }

    public PanacheQuery<Projeto> listar(String busca, boolean incluirArquivados) {
        CondicoesConsulta condicoes = new CondicoesConsulta()
                .contem("lower(nome) like :busca", "busca", busca)
                .se(!incluirArquivados, "arquivado = false");
        return find(condicoes.where(), Sort.by("nome").and("id"), condicoes.parametros());
    }
}
