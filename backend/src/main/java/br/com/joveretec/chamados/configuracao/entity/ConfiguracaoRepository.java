package br.com.joveretec.chamados.configuracao.entity;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ConfiguracaoRepository implements PanacheRepositoryBase<Configuracao, String> {
}
