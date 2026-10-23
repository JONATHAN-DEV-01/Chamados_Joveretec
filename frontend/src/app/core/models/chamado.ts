import { Referencia } from './comum';

export type Urgencia = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type StatusChamado = 'ABERTO' | 'EM_ANDAMENTO' | 'CONCLUIDO';
export type OrdemChamados = 'URGENCIA' | 'POSICAO';
export type CampoHistorico =
  | 'CRIACAO'
  | 'TITULO'
  | 'DESCRICAO'
  | 'URGENCIA'
  | 'STATUS'
  | 'RESPONSAVEL'
  | 'POSICAO';

/** Da maior para a menor, na ordem em que aparecem na interface. */
export const URGENCIAS: readonly Urgencia[] = ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'];
export const STATUS: readonly StatusChamado[] = ['ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO'];

export interface ChamadoResumo {
  id: number;
  titulo: string;
  urgencia: Urgencia;
  status: StatusChamado;
  posicao: number;
  projeto: Referencia;
  responsavel: Referencia | null;
  atualizadoEm: string;
}

export interface Chamado extends ChamadoResumo {
  descricao: string;
  criadoPor: Referencia;
  criadoEm: string;
  versao: number;
}

export interface Historico {
  id: number;
  campo: CampoHistorico;
  valorAnterior: string | null;
  valorNovo: string | null;
  usuario: Referencia;
  alteradoEm: string;
}

export interface FiltroChamados {
  projetoId?: number | null;
  responsavelId?: number | null;
  semResponsavel?: boolean;
  status?: StatusChamado[];
  urgencia?: Urgencia[];
  busca?: string;
  ordem?: OrdemChamados;
}

export interface CriarChamadoRequest {
  projetoId: number;
  titulo: string;
  descricao: string;
  urgencia: Urgencia;
  responsavelId: number | null;
  posicao: number | null;
}

export interface AtualizarChamadoRequest {
  titulo: string;
  descricao: string;
  urgencia: Urgencia;
  responsavelId: number | null;
  versao: number;
}
