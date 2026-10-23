import { Injectable, Signal, computed, signal } from '@angular/core';

/** O mínimo que o registro precisa saber de uma fila (evita importar o cliente TUS aqui). */
export interface FilaObservavel {
  readonly pendente: Signal<boolean>;
}

/**
 * Filas abertas na aplicação, para avisar antes de sair da página (troca de rota ou
 * fechar/recarregar a aba) enquanto houver envio em andamento. Fica separado da fila para
 * que o guard de rota não carregue o cliente de upload no bundle inicial.
 */
@Injectable({ providedIn: 'root' })
export class EnviosAtivos {
  private readonly filas = signal<FilaObservavel[]>([]);
  readonly emAndamento = computed(() => this.filas().some((fila) => fila.pendente()));

  constructor() {
    globalThis.addEventListener?.('beforeunload', (evento: BeforeUnloadEvent) => {
      if (this.emAndamento()) {
        evento.preventDefault();
      }
    });
  }

  registrar(fila: FilaObservavel): () => void {
    this.filas.update((filas) => [...filas, fila]);
    return () => this.filas.update((filas) => filas.filter((f) => f !== fila));
  }
}
