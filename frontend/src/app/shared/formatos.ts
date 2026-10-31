import { Pipe, PipeTransform } from '@angular/core';

const UNIDADES = ['B', 'KB', 'MB', 'GB', 'TB'];

/** Tamanho legível em base 1024: 0 B, 12 KB, 3,4 MB, 1,2 GB. */
export function tamanhoLegivel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '—';
  }
  let valor = bytes;
  let unidade = 0;
  while (valor >= 1024 && unidade < UNIDADES.length - 1) {
    valor /= 1024;
    unidade++;
  }
  const casas = unidade === 0 || valor >= 10 ? 0 : 1;
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: casas })} ${UNIDADES[unidade]}`;
}

/** Minutos em texto curto: 45min, 2h, 1h 30min. */
export function duracao(minutos: number | null | undefined): string {
  if (!minutos) {
    return '0min';
  }
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (!horas) {
    return `${resto}min`;
  }
  return resto ? `${horas}h ${resto}min` : `${horas}h`;
}

/**
 * Tempo corrido em segundos, com as duas maiores unidades: 2d 4h, 3h 20min, 45min.
 * Abaixo de um minuto, "menos de 1min"; sem valor, "—".
 */
export function tempoCorrido(segundos: number | null | undefined): string {
  if (segundos == null || !Number.isFinite(segundos) || segundos < 0) {
    return '—';
  }
  const minutos = Math.floor(segundos / 60);
  if (minutos < 1) {
    return 'menos de 1min';
  }
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const resto = minutos % 60;
  if (dias) {
    return horas ? `${dias}d ${horas}h` : `${dias}d`;
  }
  if (horas) {
    return resto ? `${horas}h ${resto}min` : `${horas}h`;
  }
  return `${resto}min`;
}

const PASSOS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.345],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
];
const RELATIVO = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

/** "agora", "há 5 minutos", "ontem", "há 3 semanas"... */
export function tempoRelativo(data: string | Date, agora: Date = new Date()): string {
  let valor = (new Date(data).getTime() - agora.getTime()) / 1000;
  if (Math.abs(valor) < 45) {
    return 'agora';
  }
  for (const [unidade, limite] of PASSOS) {
    if (Math.abs(valor) < limite) {
      return RELATIVO.format(Math.round(valor), unidade);
    }
    valor /= limite;
  }
  return RELATIVO.format(Math.round(valor), 'year');
}

/** Iniciais para o avatar: "Ana Paula Dev" → "AD". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) {
    return '?';
  }
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export function ehImagem(tipoMime: string): boolean {
  return /^image\/(png|jpe?g|gif|webp|bmp|avif)$/i.test(tipoMime);
}

/** Ícone simples por tipo de arquivo. */
export function iconeDoArquivo(tipoMime: string, nome = ''): string {
  const extensao = nome.split('.').pop()?.toLowerCase() ?? '';
  if (tipoMime.startsWith('image/')) return '🖼️';
  if (tipoMime.startsWith('video/')) return '🎞️';
  if (tipoMime.startsWith('audio/')) return '🎵';
  if (tipoMime === 'application/pdf' || extensao === 'pdf') return '📕';
  if (/zip|rar|7z|tar|gzip/.test(tipoMime) || ['zip', 'rar', '7z', 'gz', 'tar'].includes(extensao)) return '🗜️';
  if (/sheet|excel|csv/.test(tipoMime) || ['xls', 'xlsx', 'csv', 'ods'].includes(extensao)) return '📊';
  if (/word|document|rtf/.test(tipoMime) || ['doc', 'docx', 'odt', 'rtf'].includes(extensao)) return '📄';
  if (tipoMime.startsWith('text/') || ['txt', 'log', 'md', 'json', 'xml', 'yml', 'yaml'].includes(extensao)) return '📝';
  return '📎';
}

@Pipe({ name: 'tamanho' })
export class TamanhoPipe implements PipeTransform {
  transform(bytes: number): string {
    return tamanhoLegivel(bytes);
  }
}

@Pipe({ name: 'duracao' })
export class DuracaoPipe implements PipeTransform {
  transform(minutos: number | null | undefined): string {
    return duracao(minutos);
  }
}

@Pipe({ name: 'tempoCorrido' })
export class TempoCorridoPipe implements PipeTransform {
  transform(segundos: number | null | undefined): string {
    return tempoCorrido(segundos);
  }
}

@Pipe({ name: 'tempoRelativo' })
export class TempoRelativoPipe implements PipeTransform {
  transform(data: string): string {
    return tempoRelativo(data);
  }
}
