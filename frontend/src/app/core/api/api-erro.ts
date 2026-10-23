import { HttpErrorResponse } from '@angular/common/http';
import { RespostaErro } from '../models/comum';

/** Erro da API já normalizado a partir de `RespostaErro` (ou de uma falha de rede). */
export class ApiErro extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
    readonly detalhes: RespostaErro['detalhes'] = [],
  ) {
    super(mensagem);
    this.name = 'ApiErro';
  }

  static de(resposta: HttpErrorResponse): ApiErro {
    if (resposta.status === 0) {
      return new ApiErro(0, 'SEM_CONEXAO', 'Não foi possível conectar ao servidor. Verifique sua conexão.');
    }
    const corpo = resposta.error as Partial<RespostaErro> | null;
    if (corpo && typeof corpo.mensagem === 'string') {
      return new ApiErro(resposta.status, corpo.codigo ?? 'ERRO', corpo.mensagem, corpo.detalhes ?? []);
    }
    return new ApiErro(resposta.status, 'ERRO', 'Ocorreu um erro inesperado. Tente novamente.');
  }

  /** Mensagem amigável para qualquer erro capturado em um `subscribe`. */
  static mensagemDe(erro: unknown): string {
    return erro instanceof Error && erro.message ? erro.message : 'Ocorreu um erro inesperado.';
  }
}
