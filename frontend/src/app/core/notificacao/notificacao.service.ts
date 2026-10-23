import { Injectable, signal } from '@angular/core';
import { ApiErro } from '../api/api-erro';

export interface Notificacao {
  id: number;
  tipo: 'sucesso' | 'erro';
  mensagem: string;
}

const DURACAO_MS = 4500;

/** Avisos rápidos (toasts) exibidos no canto da tela. */
@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private proximoId = 1;
  private readonly _itens = signal<Notificacao[]>([]);
  readonly itens = this._itens.asReadonly();

  sucesso(mensagem: string): void {
    this.adicionar('sucesso', mensagem);
  }

  /** Aceita texto ou qualquer erro capturado (usa a mensagem padronizada da API). */
  erro(erro: unknown): void {
    this.adicionar('erro', typeof erro === 'string' ? erro : ApiErro.mensagemDe(erro));
  }

  remover(id: number): void {
    this._itens.update((itens) => itens.filter((item) => item.id !== id));
  }

  private adicionar(tipo: Notificacao['tipo'], mensagem: string): void {
    const id = this.proximoId++;
    this._itens.update((itens) => [...itens, { id, tipo, mensagem }]);
    setTimeout(() => this.remover(id), DURACAO_MS);
  }
}
