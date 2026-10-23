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
 * Arquivo ligado à abertura do chamado ou a um acompanhamento. O binário fica no Storage
 * (em {@link #caminho}); aqui ficam os metadados. Nasce PENDENTE e vira CONCLUIDO quando o
 * upload direto do navegador termina e o objeto é confirmado no Storage.
 */
@Entity
@Table(name = "anexo")
public class Anexo {

    public enum Status {
        PENDENTE,
        CONCLUIDO
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chamado_id", nullable = false, updatable = false)
    private Chamado chamado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "acompanhamento_id", updatable = false)
    private Acompanhamento acompanhamento;

    @Column(name = "nome_original", nullable = false, length = 255, updatable = false)
    private String nomeOriginal;

    @Column(nullable = false, length = 1024)
    private String caminho;

    @Column(name = "tipo_mime", nullable = false, length = 255, updatable = false)
    private String tipoMime;

    @Column(name = "tamanho_bytes", nullable = false)
    private long tamanhoBytes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Status status = Status.PENDENTE;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "enviado_por_id", nullable = false, updatable = false)
    private Usuario enviadoPor;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "concluido_em")
    private Instant concluidoEm;

    protected Anexo() {
    }

    /**
     * O caminho definitivo depende do id gerado pelo banco; até {@link #definirCaminho} ele
     * guarda apenas a pasta de destino.
     */
    public Anexo(Chamado chamado, Acompanhamento acompanhamento, String nomeOriginal, String tipoMime,
                 long tamanhoBytes, Usuario enviadoPor, String pastaDestino) {
        this.chamado = chamado;
        this.acompanhamento = acompanhamento;
        this.nomeOriginal = nomeOriginal;
        this.tipoMime = tipoMime;
        this.tamanhoBytes = tamanhoBytes;
        this.enviadoPor = enviadoPor;
        this.caminho = pastaDestino;
        this.criadoEm = Instant.now();
    }

    public void definirCaminho(String caminho) {
        this.caminho = caminho;
    }

    /** Usa o tamanho real informado pelo Storage, quando disponível. */
    public void concluir(Long tamanhoNoStorage) {
        if (tamanhoNoStorage != null) {
            this.tamanhoBytes = tamanhoNoStorage;
        }
        this.status = Status.CONCLUIDO;
        this.concluidoEm = Instant.now();
    }

    public boolean isConcluido() {
        return status == Status.CONCLUIDO;
    }

    public boolean isDaAbertura() {
        return acompanhamento == null;
    }

    public boolean enviadoPor(Usuario usuario) {
        return enviadoPor.getId().equals(usuario.getId());
    }

    public Long getId() {
        return id;
    }

    public Chamado getChamado() {
        return chamado;
    }

    public Acompanhamento getAcompanhamento() {
        return acompanhamento;
    }

    public String getNomeOriginal() {
        return nomeOriginal;
    }

    public String getCaminho() {
        return caminho;
    }

    public String getTipoMime() {
        return tipoMime;
    }

    public long getTamanhoBytes() {
        return tamanhoBytes;
    }

    public Status getStatus() {
        return status;
    }

    public Usuario getEnviadoPor() {
        return enviadoPor;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getConcluidoEm() {
        return concluidoEm;
    }
}
