package br.com.joveretec.chamados.chamado.entity;

import br.com.joveretec.chamados.projeto.entity.Projeto;
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
import jakarta.persistence.Version;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "chamado")
public class Chamado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "projeto_id", nullable = false, updatable = false)
    private Projeto projeto;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(nullable = false, columnDefinition = "text")
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Urgencia urgencia;

    /** Coluna gerada pelo banco a partir da urgência; usada apenas em consultas para ordenar. */
    @Column(name = "urgencia_peso", insertable = false, updatable = false)
    private Short urgenciaPeso;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private StatusChamado status = StatusChamado.ABERTO;

    @Column(nullable = false)
    private int posicao;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsavel_id")
    private Usuario responsavel;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "criado_por_id", nullable = false, updatable = false)
    private Usuario criadoPor;

    @Version
    @Column(nullable = false)
    private long versao;

    @CreationTimestamp
    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @UpdateTimestamp
    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    protected Chamado() {
    }

    public Chamado(Projeto projeto, String titulo, String descricao, Urgencia urgencia,
                   Usuario responsavel, Usuario criadoPor, int posicao) {
        this.projeto = projeto;
        this.titulo = titulo.trim();
        this.descricao = descricao;
        this.urgencia = urgencia;
        this.responsavel = responsavel;
        this.criadoPor = criadoPor;
        this.posicao = posicao;
    }

    public void alterarTitulo(String titulo) {
        this.titulo = titulo.trim();
    }

    public void alterarDescricao(String descricao) {
        this.descricao = descricao;
    }

    public void alterarUrgencia(Urgencia urgencia) {
        this.urgencia = urgencia;
    }

    public void alterarStatus(StatusChamado status) {
        this.status = status;
    }

    public void atribuirA(Usuario responsavel) {
        this.responsavel = responsavel;
    }

    public void moverParaPosicao(int posicao) {
        this.posicao = posicao;
    }

    public Long getId() {
        return id;
    }

    public Projeto getProjeto() {
        return projeto;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getDescricao() {
        return descricao;
    }

    public Urgencia getUrgencia() {
        return urgencia;
    }

    public StatusChamado getStatus() {
        return status;
    }

    public int getPosicao() {
        return posicao;
    }

    public Usuario getResponsavel() {
        return responsavel;
    }

    public Usuario getCriadoPor() {
        return criadoPor;
    }

    public long getVersao() {
        return versao;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }
}
