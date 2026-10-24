import { HttpContextToken } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';

/** Marque com `true` requisições que não devem acionar o indicador (ex.: prévias de imagem). */
export const SEM_INDICADOR = new HttpContextToken<boolean>(() => false);

/** Quantas operações estão em andamento; o indicador global aparece enquanto houver alguma. */
@Injectable({ providedIn: 'root' })
export class CarregamentoService {
  private readonly pendentes = signal(0);
  readonly ativo = computed(() => this.pendentes() > 0);

  /** Registra uma operação e devolve a função que a encerra (chamar uma única vez). */
  iniciar(): () => void {
    this.pendentes.update((n) => n + 1);
    let encerrada = false;
    return () => {
      if (!encerrada) {
        encerrada = true;
        this.pendentes.update((n) => Math.max(0, n - 1));
      }
    };
  }
}
