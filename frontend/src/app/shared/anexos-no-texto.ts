import { ehImagem } from './formatos';

/**
 * Anexos dentro do texto (descrição do chamado e acompanhamentos), em Markdown:
 * imagem `![nome](anexo:12)`, outros arquivos `[nome](anexo:12)`. Enquanto o arquivo sobe,
 * o texto guarda um marcador `[⏳ Enviando nome…](enviando:3)`, trocado pela referência no fim.
 */
const REFERENCIA = /!?\[[^\]]*\]\(anexo:(\d+)\)/g;

/** `[` e `]` no nome quebrariam o Markdown. */
function nomeSeguro(nome: string): string {
  return nome.replace(/[[\]]/g, '').trim() || 'arquivo';
}

export function referenciaDoAnexo(anexo: { id: number; nome: string; tipoMime: string }): string {
  return `${ehImagem(anexo.tipoMime) ? '!' : ''}[${nomeSeguro(anexo.nome)}](anexo:${anexo.id})`;
}

export function marcadorDeEnvio(chave: number, nome: string): string {
  return `[⏳ Enviando ${nomeSeguro(nome)}…](enviando:${chave})`;
}

/** Expressão que encontra o marcador de um envio (qualquer nome). */
export function buscaDoMarcador(chave: number): RegExp {
  return new RegExp(`\\[⏳ Enviando [^\\]]*…\\]\\(enviando:${chave}\\)`);
}

/** Ids citados no texto, na ordem e sem repetição. */
export function idsReferenciados(texto: string | null | undefined): number[] {
  const ids = Array.from((texto ?? '').matchAll(REFERENCIA), (m) => Number(m[1]));
  return [...new Set(ids)];
}

/** Anexos que não aparecem no texto: continuam na lista abaixo dele (inclui os do modelo antigo). */
export function naoReferenciados<T extends { id: number }>(texto: string | null | undefined, anexos: T[]): T[] {
  const citados = new Set(idsReferenciados(texto));
  return anexos.filter((anexo) => !citados.has(anexo.id));
}
