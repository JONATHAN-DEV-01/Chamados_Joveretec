export interface Paleta {
  fundo: string;
  superficie: string;
  destaque: string;
  texto: string;
}

export interface Configuracao {
  paleta: Paleta;
  geral: {
    nomeSistema: string;
    tamanhoPaginaPadrao: number;
  };
}

/** Mesmos valores do seed do backend; usados até a configuração carregar ou se ela falhar. */
export const CONFIGURACAO_PADRAO: Configuracao = {
  paleta: { fundo: '#171717', superficie: '#444444', destaque: '#DA0037', texto: '#EDEDED' },
  geral: { nomeSistema: 'Chamados Joveretec', tamanhoPaginaPadrao: 20 },
};
