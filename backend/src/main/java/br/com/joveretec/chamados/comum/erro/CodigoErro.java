package br.com.joveretec.chamados.comum.erro;

public enum CodigoErro {
    VALIDACAO(400),
    NAO_AUTENTICADO(401),
    ACESSO_NEGADO(403),
    NAO_ENCONTRADO(404),
    METODO_NAO_PERMITIDO(405),
    CONFLITO(409),
    REGRA_NEGOCIO(422),
    ERRO_INTERNO(500),
    INDISPONIVEL(503);

    private final int status;

    CodigoErro(int status) {
        this.status = status;
    }

    public int status() {
        return status;
    }

    public static CodigoErro doStatus(int status) {
        for (CodigoErro codigo : values()) {
            if (codigo.status == status) {
                return codigo;
            }
        }
        return status >= 500 ? ERRO_INTERNO : VALIDACAO;
    }
}
