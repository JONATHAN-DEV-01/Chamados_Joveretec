import { FiltroChamados, STATUS, StatusChamado, URGENCIAS, Urgencia } from '../../../core/models/chamado';

/** Valor especial de `responsavel` na URL para "sem responsável". */
export const SEM_RESPONSAVEL = 'nenhum';

/** Estado da lista como aparece na URL (todos texto, como vêm dos query params). */
export interface ParametrosLista {
  projetoId?: string;
  responsavel?: string;
  status?: string;
  urgencia?: string;
  busca?: string;
  pagina?: string;
}

export function lerLista<T extends string>(valor: string | undefined, validos: readonly T[]): T[] {
  return (valor ?? '').split(',').filter((item): item is T => (validos as readonly string[]).includes(item));
}

function numero(valor: string | undefined): number | null {
  const n = Number(valor);
  return valor && Number.isInteger(n) && n >= 0 ? n : null;
}

export function paraFiltro(p: ParametrosLista): FiltroChamados {
  const semResponsavel = p.responsavel === SEM_RESPONSAVEL;
  return {
    projetoId: numero(p.projetoId),
    responsavelId: semResponsavel ? null : numero(p.responsavel),
    semResponsavel,
    status: lerLista<StatusChamado>(p.status, STATUS),
    urgencia: lerLista<Urgencia>(p.urgencia, URGENCIAS),
    busca: p.busca?.trim() || undefined,
  };
}

export function paginaDa(p: ParametrosLista): number {
  return numero(p.pagina) ?? 0;
}

/** Liga/desliga um valor em uma lista separada por vírgula (chips de filtro). */
export function alternar<T extends string>(atual: T[], valor: T): string | null {
  const nova = atual.includes(valor) ? atual.filter((item) => item !== valor) : [...atual, valor];
  return nova.length ? nova.join(',') : null;
}
