package br.com.joveretec.chamados.usuario.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.Optional;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(nullable = false, length = 160)
    private String email;

    @Column(name = "senha_hash", nullable = false, length = 100)
    private String senhaHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Perfil perfil;

    @Column(nullable = false)
    private boolean ativo = true;

    @CreationTimestamp
    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    /* Paleta pessoal: as quatro colunas são todas nulas (segue a global) ou todas preenchidas (V8). */
    @Column(name = "paleta_fundo", length = 7)
    private String paletaFundo;

    @Column(name = "paleta_superficie", length = 7)
    private String paletaSuperficie;

    @Column(name = "paleta_destaque", length = 7)
    private String paletaDestaque;

    @Column(name = "paleta_texto", length = 7)
    private String paletaTexto;

    /** Última versão das "Novidades da plataforma" que o usuário já viu (0 = nenhuma). */
    @Column(name = "novidades_vistas_versao", nullable = false)
    private int novidadesVistasVersao;

    @UpdateTimestamp
    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    protected Usuario() {
    }

    public Usuario(String nome, String email, String senhaHash, Perfil perfil) {
        this.nome = nome.trim();
        this.email = normalizarEmail(email);
        this.senhaHash = senhaHash;
        this.perfil = perfil;
    }

    public static String normalizarEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    public void atualizarDados(String nome, String email, Perfil perfil) {
        this.nome = nome.trim();
        this.email = normalizarEmail(email);
        this.perfil = perfil;
    }

    public void alterarSenhaHash(String senhaHash) {
        this.senhaHash = senhaHash;
    }

    public void definirPaleta(PaletaPessoal paleta) {
        this.paletaFundo = paleta.fundo();
        this.paletaSuperficie = paleta.superficie();
        this.paletaDestaque = paleta.destaque();
        this.paletaTexto = paleta.texto();
    }

    /** Volta a seguir a paleta global do sistema. */
    public void removerPaleta() {
        this.paletaFundo = null;
        this.paletaSuperficie = null;
        this.paletaDestaque = null;
        this.paletaTexto = null;
    }

    public Optional<PaletaPessoal> getPaleta() {
        return paletaFundo == null ? Optional.empty()
                : Optional.of(new PaletaPessoal(paletaFundo, paletaSuperficie, paletaDestaque, paletaTexto));
    }

    /** Só avança: reabrir novidades antigas não faz as mais novas aparecerem de novo. */
    public void marcarNovidadesVistas(int versao) {
        novidadesVistasVersao = Math.max(novidadesVistasVersao, versao);
    }

    public int getNovidadesVistasVersao() {
        return novidadesVistasVersao;
    }

    public void desativar() {
        this.ativo = false;
    }

    public void reativar() {
        this.ativo = true;
    }

    public boolean isAdmin() {
        return perfil == Perfil.ADMIN;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public Perfil getPerfil() {
        return perfil;
    }

    public boolean isAtivo() {
        return ativo;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }
}
