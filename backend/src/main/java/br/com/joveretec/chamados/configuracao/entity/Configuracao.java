package br.com.joveretec.chamados.configuracao.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "configuracao")
public class Configuracao {

    @Id
    @Column(length = 60)
    private String chave;

    @Column(nullable = false, length = 500)
    private String valor;

    @UpdateTimestamp
    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    @Column(name = "atualizado_por_id")
    private Long atualizadoPorId;

    protected Configuracao() {
    }

    public Configuracao(String chave, String valor) {
        this.chave = chave;
        this.valor = valor;
    }

    public void alterarValor(String valor, Long usuarioId) {
        this.valor = valor;
        this.atualizadoPorId = usuarioId;
    }

    public String getChave() {
        return chave;
    }

    public String getValor() {
        return valor;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }

    public Long getAtualizadoPorId() {
        return atualizadoPorId;
    }
}
