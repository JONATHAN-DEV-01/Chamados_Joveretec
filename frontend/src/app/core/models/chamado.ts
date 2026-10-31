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
  | 'RESPONSAVEL_ADICIONADO'
  | 'RESPONSAVEL_REMOVIDO'
  | 'POSICAO'
  | 'ANEXO_ADICIONADO'
  | 'ANEXO_REMOVIDO';

/** Da maior para a menor, na ordem em que aparecem na interface. */
export const URGENCIAS: readonly Urgencia[] = ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'];
export const STATUS: readonly StatusChamado[] = ['ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO'];
/** Concluídos saem da fila do projeto. */
export const STATUS_DA_FILA: readonly StatusChamado[] = ['ABERTO', 'EM_ANDAMENTO'];

export interface ChamadoResumo {
  id: number;
  titulo: string;
  urgencia: Urgencia;
  status: StatusChamado;
  /** Posição na fila do projeto; null para concluídos (eles saem da fila). */
  posicao: number | null;
  projeto: Referencia;
  /** Em ordem alfabética; vazio = sem responsável. */
  responsaveis: Referencia[];
  atualizadoEm: string;
  /** Inclui acompanhamentos e anexos (atualizadoEm cobre só os dados do chamado). */
  ultimaAtividadeEm: string;
}

export interface Chamado extends ChamadoResumo {
  descricao: string;
  criadoPor: Referencia;
  criadoEm: string;
  tempoGastoTotalMinutos: number;
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
  responsavelIds: number[];
  posicao: number | null;
  /** Rascunhos enviados pela descrição (colar/arrastar), ligados ao chamado na criação. */
  anexoIds: number[];
}

export interface AtualizarChamadoRequest {
  titulo: string;
  descricao: string;
  urgencia: Urgencia;
  responsavelIds: number[];
  versao: number;
}
