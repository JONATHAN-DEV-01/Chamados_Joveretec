import { Signal, computed, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, catchError, of, switchMap, tap } from 'rxjs';
import { ApiErro } from '../core/api/api-erro';

/** Lista auxiliar (ex.: opções de um select): vazia até carregar e vazia se falhar. */
export function listaDeApoio<T>(fonte: Observable<T[]>): Signal<T[]> {
  return toSignal(fonte.pipe(catchError(() => of([] as T[]))), { initialValue: [] as T[] });
}

export interface Carregamento<T> {
  /** Último resultado com sucesso (mantido durante novos carregamentos, sem "piscar"). */
  readonly dados: Signal<T | undefined>;
  readonly carregando: Signal<boolean>;
  readonly erro: Signal<string | null>;
  recarregar(): void;
}

/**
 * Busca dados sempre que os parâmetros mudam (cancelando a requisição anterior) e expõe
 * o estado como signals. Deve ser chamada em contexto de injeção (campo ou construtor).
 */
export function carregarComParametros<P, T>(
  parametros: Signal<P>,
  buscar: (parametros: P) => Observable<T>,
): Carregamento<T> {
  const dados = signal<T | undefined>(undefined);
  const carregando = signal(true);
  const erro = signal<string | null>(null);
  const versao = signal(0);
  const gatilho = computed(() => ({ parametros: parametros(), versao: versao() }));

  toObservable(gatilho)
    .pipe(
      tap(() => {
        carregando.set(true);
        erro.set(null);
      }),
      switchMap(({ parametros: valor }) =>
        buscar(valor).pipe(
          catchError((falha: unknown) => {
            erro.set(ApiErro.mensagemDe(falha));
            carregando.set(false);
            return EMPTY;
          }),
        ),
      ),
      takeUntilDestroyed(),
    )
    .subscribe((resultado) => {
      dados.set(resultado);
      carregando.set(false);
    });

  return {
    dados: dados.asReadonly(),
    carregando: carregando.asReadonly(),
    erro: erro.asReadonly(),
    recarregar: () => versao.update((v) => v + 1),
  };
}
