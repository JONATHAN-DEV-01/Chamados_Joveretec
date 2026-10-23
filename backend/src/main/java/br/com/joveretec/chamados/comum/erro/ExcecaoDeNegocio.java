package br.com.joveretec.chamados.comum.erro;

/** Erro esperado de negócio; traduzido para {@link RespostaErro} pelo {@link ExcecaoDeNegocioMapper}. */
public class ExcecaoDeNegocio extends RuntimeException {

    private final CodigoErro codigo;

    public ExcecaoDeNegocio(CodigoErro codigo, String mensagem) {
        super(mensagem);
        this.codigo = codigo;
    }

    public static ExcecaoDeNegocio validacao(String mensagem) {
        return new ExcecaoDeNegocio(CodigoErro.VALIDACAO, mensagem);
    }

    public static ExcecaoDeNegocio naoEncontrado(String mensagem) {
        return new ExcecaoDeNegocio(CodigoErro.NAO_ENCONTRADO, mensagem);
    }

    public static ExcecaoDeNegocio conflito(String mensagem) {
        return new ExcecaoDeNegocio(CodigoErro.CONFLITO, mensagem);
    }

    public static ExcecaoDeNegocio regraDeNegocio(String mensagem) {
        return new ExcecaoDeNegocio(CodigoErro.REGRA_NEGOCIO, mensagem);
    }

    public static ExcecaoDeNegocio naoAutenticado(String mensagem) {
        return new ExcecaoDeNegocio(CodigoErro.NAO_AUTENTICADO, mensagem);
    }

    public static ExcecaoDeNegocio acessoNegado(String mensagem) {
        return new ExcecaoDeNegocio(CodigoErro.ACESSO_NEGADO, mensagem);
    }

    public CodigoErro codigo() {
        return codigo;
    }
}
