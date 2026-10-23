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
