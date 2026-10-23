package br.com.joveretec.chamados.chamado.entity;

import br.com.joveretec.chamados.usuario.entity.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Registro de andamento no feed do chamado. Nasce como RASCUNHO quando o autor começa a anexar
 * arquivos (os anexos precisam do id para o caminho no Storage) e só aparece no feed ao ser publicado.
 */
@Entity
@Table(name = "acompanhamento")
public class Acompanhamento {

    public enum Situacao {
        RASCUNHO,
        PUBLICADO
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chamado_id", nullable = false, updatable = false)
    private Chamado chamado;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "autor_id", nullable = false, updatable = false)
    private Usuario autor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Situacao situacao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private TipoAcompanhamento tipo = TipoAcompanhamento.ACOMPANHAMENTO;

    @Column(columnDefinition = "text")
    private String texto;

    @Column(name = "tempo_gasto_minutos")
    private Integer tempoGastoMinutos;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "editado_em")
    private Instant editadoEm;

    protected Acompanhamento() {
    }

    private Acompanhamento(Chamado chamado, Usuario autor, Situacao situacao) {
        this.chamado = chamado;
        this.autor = autor;
        this.situacao = situacao;
        this.criadoEm = Instant.now();
    }

    public static Acompanhamento rascunho(Chamado chamado, Usuario autor) {
        return new Acompanhamento(chamado, autor, Situacao.RASCUNHO);
    }

    public static Acompanhamento publicado(Chamado chamado, Usuario autor, DadosAcompanhamento dados) {
        Acompanhamento acompanhamento = new Acompanhamento(chamado, autor, Situacao.PUBLICADO);
        acompanhamento.aplicar(dados);
        return acompanhamento;
    }

    /** Publica um rascunho: a data no feed passa a ser a da publicação. */
    public void publicar(DadosAcompanhamento dados) {
        aplicar(dados);
        this.situacao = Situacao.PUBLICADO;
        this.criadoEm = Instant.now();
    }

    public void editar(DadosAcompanhamento dados) {
        aplicar(dados);
        this.editadoEm = Instant.now();
    }

    private void aplicar(DadosAcompanhamento dados) {
        this.texto = dados.texto();
        this.tipo = dados.tipo();
        this.tempoGastoMinutos = dados.tempoGastoMinutos();
    }

    public boolean isRascunho() {
        return situacao == Situacao.RASCUNHO;
    }

    public boolean isSolucao() {
        return tipo == TipoAcompanhamento.SOLUCAO;
    }

    public boolean pertenceA(Usuario usuario) {
        return autor.getId().equals(usuario.getId());
    }

    public Long getId() {
        return id;
    }

    public Chamado getChamado() {
        return chamado;
    }

    public Usuario getAutor() {
        return autor;
    }

    public Situacao getSituacao() {
        return situacao;
    }

    public TipoAcompanhamento getTipo() {
        return tipo;
    }

    public String getTexto() {
        return texto;
    }

    public Integer getTempoGastoMinutos() {
        return tempoGastoMinutos;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getEditadoEm() {
        return editadoEm;
    }

    /** Campos editáveis de um acompanhamento. */
    public record DadosAcompanhamento(String texto, TipoAcompanhamento tipo, Integer tempoGastoMinutos) {
    }
}
