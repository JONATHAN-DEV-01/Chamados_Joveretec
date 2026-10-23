package br.com.joveretec.chamados.comum.seguranca;

import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class BcryptHashDeSenha implements HashDeSenha {

    private static final int CUSTO = 12;

    @Override
    public String gerar(String senha) {
        return BcryptUtil.bcryptHash(senha, CUSTO);
    }

    @Override
    public boolean confere(String senha, String hash) {
        return senha != null && hash != null && BcryptUtil.matches(senha, hash);
    }
}
