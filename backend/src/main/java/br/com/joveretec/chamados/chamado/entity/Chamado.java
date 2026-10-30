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
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

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

    /** Posição na fila do projeto (1..n entre os ativos); {@code null} quando concluído. */
    @Column
    private Integer posicao;

    /** Nenhum responsável = "sem responsável". Carregados em lote nas listagens (sem N+1). */
    @ManyToMany
    @JoinTable(name = "chamado_responsavel",
            joinColumns = @JoinColumn(name = "chamado_id"),
            inverseJoinColumns = @JoinColumn(name = "usuario_id"))
    @OrderBy("nome asc, id asc")
    @BatchSize(size = 100)
    private Set<Usuario> responsaveis = new LinkedHashSet<>();

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

    /**
     * Última atividade: edições do chamado (aqui) e acompanhamentos/anexos
     * ({@link ChamadoRepository#registrarAtividade}, que não altera a versão).
     */
    @Column(name = "ultima_atividade_em", nullable = false)
    private Instant ultimaAtividadeEm;

    protected Chamado() {
    }

    public Chamado(Projeto projeto, String titulo, String descricao, Urgencia urgencia,
                   Collection<Usuario> responsaveis, Usuario criadoPor, int posicao) {
        this.projeto = projeto;
        this.titulo = titulo.trim();
        this.descricao = descricao;
        this.urgencia = urgencia;
        this.responsaveis.addAll(responsaveis);
        this.criadoPor = criadoPor;
        this.posicao = posicao;
    }

    @PrePersist
    @PreUpdate
    void registrarAtividade() {
        this.ultimaAtividadeEm = Instant.now();
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

    /** Troca os responsáveis pelos informados (altera a versão do chamado, como qualquer edição). */
    public void definirResponsaveis(Collection<Usuario> novos) {
        responsaveis.removeIf(atual -> novos.stream().noneMatch(n -> n.getId().equals(atual.getId())));
        novos.forEach(this::adicionarResponsavel);
    }

    /** Inclui o usuário entre os responsáveis; retorna {@code false} se ele já era um deles. */
    public boolean adicionarResponsavel(Usuario usuario) {
        return responsaveis.stream().noneMatch(r -> r.getId().equals(usuario.getId())) && responsaveis.add(usuario);
    }

    public boolean temResponsavel(Long usuarioId) {
        return responsaveis.stream().anyMatch(r -> r.getId().equals(usuarioId));
    }

    public void moverParaPosicao(int posicao) {
        this.posicao = posicao;
    }

    /** Sai da fila (ao ser concluído). */
    public void sairDaFila() {
        this.posicao = null;
    }

    public boolean estaNaFila() {
        return posicao != null;
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

    public Integer getPosicao() {
        return posicao;
    }

    /** Coleção gerenciada, só para o repositório inicializá-la em lote. */
    Set<Usuario> responsaveisParaCarga() {
        return responsaveis;
    }

    /** Responsáveis em ordem alfabética. */
    public List<Usuario> getResponsaveis() {
        return List.copyOf(responsaveis);
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

    public Instant getUltimaAtividadeEm() {
        return ultimaAtividadeEm;
    }
}
