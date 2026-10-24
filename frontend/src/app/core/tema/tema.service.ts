import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Paleta } from '../models/configuracao';
import { corHexValida, luminancia, textoSobre } from './cores';

/** Mesma chave lida pelo script do index.html, que reaplica a paleta antes do Angular subir. */
export const CHAVE_PALETA_LOCAL = 'chamados.paleta';

/** Aplica a paleta em variáveis CSS de um elemento (por padrão, `:root`). */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);

  aplicar(paleta: Paleta, elemento: HTMLElement = this.documento.documentElement): void {
    if (!Object.values(paleta).every(corHexValida)) {
      return;
    }
    const estilo = elemento.style;
    estilo.setProperty('--cor-fundo', paleta.fundo);
    estilo.setProperty('--cor-superficie', paleta.superficie);
    estilo.setProperty('--cor-destaque', paleta.destaque);
    estilo.setProperty('--cor-texto', paleta.texto);
    estilo.setProperty('--cor-sobre-destaque', textoSobre(paleta.destaque));
    estilo.setProperty('color-scheme', luminancia(paleta.fundo) < 0.5 ? 'dark' : 'light');
    if (elemento === this.documento.documentElement) {
      lembrar(paleta);
    }
  }
}

/** Guarda a paleta global para a próxima abertura (só conveniência: falhas são ignoradas). */
function lembrar(paleta: Paleta): void {
  try {
    globalThis.localStorage?.setItem(CHAVE_PALETA_LOCAL, JSON.stringify(paleta));
  } catch {
    // armazenamento indisponível (modo privado, bloqueado...): segue com a paleta do servidor
  }
}
