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
  /** Só leitura (definido no servidor): o navegador avisa antes de enviar; o backend valida de novo. */
  anexos: {
    tamanhoMaximoBytes: number;
    extensoesBloqueadas: string[];
  };
}

/** Mesmos valores do seed do backend; usados até a configuração carregar ou se ela falhar. */
export const CONFIGURACAO_PADRAO: Configuracao = {
  paleta: { fundo: '#171717', superficie: '#444444', destaque: '#DA0037', texto: '#EDEDED' },
  geral: { nomeSistema: 'Chamados Joveretec', tamanhoPaginaPadrao: 20 },
  anexos: {
    tamanhoMaximoBytes: 50 * 1024 * 1024,
    extensoesBloqueadas: ['bat', 'cmd', 'com', 'cpl', 'exe', 'hta', 'lnk', 'msi', 'pif', 'reg', 'scr', 'vbe', 'vbs'],
  },
};
