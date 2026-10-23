/** Espelha `Pagina<T>` do backend (paginação no servidor, `pagina` começa em 0). */
export interface Pagina<T> {
  itens: T[];
  pagina: number;
  tamanho: number;
  totalItens: number;
  totalPaginas: number;
}

export interface Paginacao {
  pagina?: number;
  tamanho?: number;
}

/** Referência resumida (id + nome) a um projeto ou usuário. */
export interface Referencia {
  id: number;
  nome: string;
}

/** Corpo padrão de erro da API (`RespostaErro`). */
export interface RespostaErro {
  codigo: string;
  mensagem: string;
  detalhes: { campo: string; mensagem: string }[];
  timestamp: string;
}
