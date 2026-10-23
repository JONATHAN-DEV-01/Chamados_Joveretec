import { Pipe, PipeTransform } from '@angular/core';
import { Marked, Renderer, Tokens } from 'marked';

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PROTOCOLO_SEGURO = /^(https?:|mailto:)/i;

const renderer = new Renderer();
// HTML escrito pelo usuário vira texto: nada de tags arbitrárias.
renderer.html = ({ text }: Tokens.HTML | Tokens.Tag) => escapar(text);
// Links só com http(s)/mailto, sempre em nova aba e sem acesso à janela de origem.
renderer.link = function ({ href, title, tokens }: Tokens.Link) {
  const texto = this.parser.parseInline(tokens);
  if (!PROTOCOLO_SEGURO.test(href)) {
    return texto;
  }
  const titulo = title ? ` title="${escapar(title)}"` : '';
  return `<a href="${escapar(href)}"${titulo} target="_blank" rel="noopener noreferrer">${texto}</a>`;
};
// Imagens externas não são carregadas (evita rastreamento); vira link.
renderer.image = ({ href, text }: Tokens.Image) =>
  PROTOCOLO_SEGURO.test(href)
    ? `<a href="${escapar(href)}" target="_blank" rel="noopener noreferrer">${escapar(text || href)}</a>`
    : escapar(text);

const marked = new Marked({ gfm: true, breaks: true, renderer });

/**
 * Markdown simples (negrito, itálico, listas, código, links, citações, quebras de linha).
 * HTML bruto é escapado e o resultado ainda passa pelo sanitizador do Angular no [innerHTML].
 */
export function renderizarMarkdown(texto: string | null | undefined): string {
  return texto ? (marked.parse(texto, { async: false }) as string) : '';
}

@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  transform(texto: string | null | undefined): string {
    return renderizarMarkdown(texto);
  }
}
