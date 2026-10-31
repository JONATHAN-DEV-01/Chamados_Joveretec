import { Paleta } from '../models/configuracao';

const HEX = /^#[0-9a-f]{6}$/i;

export function corHexValida(valor: string | null | undefined): boolean {
  return !!valor && HEX.test(valor);
}

/** Luminância relativa (WCAG 2.x) de uma cor `#RRGGBB`. */
export function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(hexA: string, hexB: string): number {
  const [maior, menor] = [luminancia(hexA), luminancia(hexB)].sort((a, b) => b - a);
  return (maior + 0.05) / (menor + 0.05);
}

/** Preto ou branco, o que tiver mais contraste sobre a cor informada (texto de botões). */
export function textoSobre(hex: string): '#000000' | '#FFFFFF' {
  return contraste(hex, '#000000') >= contraste(hex, '#FFFFFF') ? '#000000' : '#FFFFFF';
}

/** Avisos de legibilidade (WCAG): texto ≥ 4,5:1 e destaque ≥ 3:1 sobre o fundo. */
export function avisosDeLegibilidade(paleta: Partial<Paleta>): string[] {
  const { fundo, texto, destaque } = paleta;
  if (!corHexValida(fundo) || !corHexValida(texto) || !corHexValida(destaque)) {
    return [];
  }
  const avisos: string[] = [];
  if (contraste(texto!, fundo!) < 4.5) {
    avisos.push('O texto tem pouco contraste com o fundo e pode ficar difícil de ler.');
  }
  if (contraste(destaque!, fundo!) < 3) {
    avisos.push('A cor de destaque se confunde com o fundo (botões e urgências perdem visibilidade).');
  }
  return avisos;
}
