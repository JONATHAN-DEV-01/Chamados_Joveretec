export interface Projeto {
  id: number;
  nome: string;
  descricao: string | null;
  arquivado: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface SalvarProjetoRequest {
  nome: string;
  descricao?: string | null;
}

export interface FiltroProjetos {
  busca?: string;
  incluirArquivados?: boolean;
}
