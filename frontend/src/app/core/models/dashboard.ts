import { StatusChamado, Urgencia } from './chamado';
import { Referencia } from './comum';

export interface TotalPorStatus {
  status: StatusChamado;
  total: number;
}

export interface TotalPorUrgencia {
  urgencia: Urgencia;
  total: number;
}

export interface TotalPorDesenvolvedor {
  usuario: Referencia;
  abertos: number;
  emAndamento: number;
  concluidos: number;
  total: number;
}

export interface MeusChamados {
  total: number;
  porStatus: TotalPorStatus[];
  porUrgencia: TotalPorUrgencia[];
}

/** Card "Tempo por chamado": tempo corrido em segundos; as médias consideram só os concluídos. */
export interface TemposDashboard {
  concluidos: number;
  resolucaoMediaSegundos: number | null;
  andamentoMedioSegundos: number | null;
  porResponsavel: TempoPorResponsavel[];
  abertosHaMaisTempo: ChamadoEmAberto[];
}

export interface TempoPorResponsavel {
  usuario: Referencia;
  concluidos: number;
  resolucaoMediaSegundos: number;
  andamentoMedioSegundos: number;
}

export interface ChamadoEmAberto {
  chamado: { id: number; titulo: string };
  status: StatusChamado;
  urgencia: Urgencia;
  criadoEm: string;
  abertoHaSegundos: number;
  emAndamentoSegundos: number;
}
