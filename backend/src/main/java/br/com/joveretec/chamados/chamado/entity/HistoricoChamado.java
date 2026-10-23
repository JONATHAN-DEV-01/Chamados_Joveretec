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
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "historico_chamado")
public class HistoricoChamado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chamado_id", nullable = false, updatable = false)
    private Chamado chamado;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false, updatable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30, updatable = false)
    private CampoHistorico campo;

    @Column(name = "valor_anterior", columnDefinition = "text", updatable = false)
    private String valorAnterior;

    @Column(name = "valor_novo", columnDefinition = "text", updatable = false)
    private String valorNovo;

    @CreationTimestamp
    @Column(name = "alterado_em", nullable = false, updatable = false)
    private Instant alteradoEm;

    protected HistoricoChamado() {
    }

    public HistoricoChamado(Chamado chamado, Usuario usuario, CampoHistorico campo,
                            String valorAnterior, String valorNovo) {
        this.chamado = chamado;
        this.usuario = usuario;
        this.campo = campo;
        this.valorAnterior = valorAnterior;
        this.valorNovo = valorNovo;
    }

    public Long getId() {
        return id;
    }

    public Chamado getChamado() {
        return chamado;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public CampoHistorico getCampo() {
        return campo;
    }

    public String getValorAnterior() {
        return valorAnterior;
    }

    public String getValorNovo() {
        return valorNovo;
    }

    public Instant getAlteradoEm() {
        return alteradoEm;
    }
}
