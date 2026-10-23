import { Historico } from './chamado';
import { Referencia } from './comum';

export type TipoAcompanhamento = 'ACOMPANHAMENTO' | 'SOLUCAO';
export type OrdemFeed = 'ASC' | 'DESC';

export interface Anexo {
  id: number;
  nome: string;
  tipoMime: string;
  tamanhoBytes: number;
  status: 'PENDENTE' | 'CONCLUIDO';
  enviadoPor: Referencia;
  criadoEm: string;
  podeExcluir: boolean;
}

export interface Acompanhamento {
  id: number;
  tipo: TipoAcompanhamento;
  texto: string;
  tempoGastoMinutos: number | null;
  autor: Referencia;
  criadoEm: string;
  editadoEm: string | null;
  podeAlterar: boolean;
  anexos: Anexo[];
}

export interface Abertura {
  descricao: string;
  autor: Referencia;
  criadoEm: string;
  anexos: Anexo[];
}

/** Item da linha do tempo; só o campo do respectivo `tipo` vem preenchido. */
export type ItemFeed =
  | { tipo: 'ABERTURA'; data: string; abertura: Abertura }
  | { tipo: 'ACOMPANHAMENTO'; data: string; acompanhamento: Acompanhamento }
  | { tipo: 'EVENTO'; data: string; evento: Historico };

export interface SalvarAcompanhamento {
  texto: string;
  tipo: TipoAcompanhamento;
  tempoGastoMinutos: number | null;
}

export interface PublicarAcompanhamento extends SalvarAcompanhamento {
  /** Só para Solução: conclui o chamado na mesma ação. */
  concluirChamado: boolean;
  /** Rascunho que já recebeu os anexos. */
  rascunhoId: number | null;
}

/** Como enviar o arquivo direto ao armazenamento (TUS no Supabase, PUT no modo local). */
export interface EnvioAutorizado {
  anexo: Anexo;
  envio: {
    protocolo: 'TUS' | 'PUT';
    url: string;
    cabecalhos: Record<string, string>;
    metadados: Record<string, string>;
    tamanhoParte: number;
  };
}

export interface UltimaAtualizacao {
  acompanhamentoId: number;
  chamado: { id: number; titulo: string };
  autor: Referencia;
  tipo: TipoAcompanhamento;
  resumo: string;
  criadoEm: string;
}
