package br.com.joveretec.chamados.comum.seguranca;

public interface HashDeSenha {

    String gerar(String senha);

    boolean confere(String senha, String hash);
}
