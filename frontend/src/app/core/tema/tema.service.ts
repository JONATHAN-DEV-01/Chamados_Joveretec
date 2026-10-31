import { DOCUMENT, Injectable, effect, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { CONFIGURACAO_PADRAO, Paleta } from '../models/configuracao';
import { corHexValida, luminancia, textoSobre } from './cores';

/** Mesma chave lida pelo script do index.html, que reaplica a paleta antes do Angular subir. */
export const CHAVE_PALETA_LOCAL = 'chamados.paleta';

/**
 * Cores da página em variáveis CSS. Há duas paletas:
 * - **global**: a do sistema, definida pelo admin. Vale para todos e sempre para a tela de login;
 *   fica guardada no navegador para a próxima abertura;
 * - **pessoal**: a do usuário logado (vem na sessão), por cima da global. Some ao sair.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);
  private global: Paleta = lembrada() ?? CONFIGURACAO_PADRAO.paleta;
  private pessoal: Paleta | null = null;

  constructor() {
    const auth = inject(AuthService);
    // Login, logout, troca de usuário ou paleta salva em "Meu perfil".
    effect(() => this.definirPessoal(auth.usuario()?.paleta));
  }

  /** Paleta do sistema (configurações do admin). */
  definirGlobal(paleta: Paleta): void {
    if (!valida(paleta)) {
      return;
    }
    this.global = paleta;
    lembrar(paleta);
    this.aplicarNaPagina();
  }

  /** Paleta do usuário logado; sem paleta (ou ao sair), volta à global. */
  definirPessoal(paleta: Paleta | null | undefined): void {
    this.pessoal = paleta && valida(paleta) ? paleta : null;
    this.aplicarNaPagina();
  }

  /** Aplica só num elemento (pré-visualização), sem mudar a página. */
  aplicar(paleta: Paleta, elemento: HTMLElement): void {
    if (valida(paleta)) {
      escrever(paleta, elemento);
    }
  }

  private aplicarNaPagina(): void {
    escrever(this.pessoal ?? this.global, this.documento.documentElement);
  }
}

function valida(paleta: Paleta): boolean {
  return [paleta.fundo, paleta.superficie, paleta.destaque, paleta.texto].every(corHexValida);
}

function escrever(paleta: Paleta, elemento: HTMLElement): void {
  const estilo = elemento.style;
  estilo.setProperty('--cor-fundo', paleta.fundo);
  estilo.setProperty('--cor-superficie', paleta.superficie);
  estilo.setProperty('--cor-destaque', paleta.destaque);
  estilo.setProperty('--cor-texto', paleta.texto);
  estilo.setProperty('--cor-sobre-destaque', textoSobre(paleta.destaque));
  estilo.setProperty('color-scheme', luminancia(paleta.fundo) < 0.5 ? 'dark' : 'light');
}

/** Guarda a paleta global para a próxima abertura (só conveniência: falhas são ignoradas). */
function lembrar(paleta: Paleta): void {
  try {
    globalThis.localStorage?.setItem(CHAVE_PALETA_LOCAL, JSON.stringify(paleta));
  } catch {
    // armazenamento indisponível (modo privado, bloqueado...): segue com a paleta do servidor
  }
}

function lembrada(): Paleta | null {
  try {
    const paleta = JSON.parse(globalThis.localStorage?.getItem(CHAVE_PALETA_LOCAL) ?? 'null') as Paleta | null;
    return paleta && valida(paleta) ? paleta : null;
  } catch {
    return null;
  }
}
