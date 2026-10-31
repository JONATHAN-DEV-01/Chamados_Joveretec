import { Signal, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, catchError, of, switchMap, tap } from 'rxjs';
import { ApiErro } from '../core/api/api-erro';
import { CacheEmMemoria } from '../core/api/cache-em-memoria';
import { AuthService } from '../core/auth/auth.service';

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

export interface OpcoesDeCarregamento {
  /**
   * Nome da tela: o último resultado de cada combinação de parâmetros fica na memória da aba
   * (separado por usuário) e reaparece na hora ao voltar, enquanto a versão nova é buscada.
   */
  cache?: string;
}

/** Resultados guardados pelas telas que pedem `cache` (os mais antigos saem primeiro). */
const resultadosGuardados = new CacheEmMemoria<unknown>(30);

/**
 * Busca dados sempre que os parâmetros mudam (cancelando a requisição anterior) e expõe
 * o estado como signals. Deve ser chamada em contexto de injeção (campo ou construtor).
 */
export function carregarComParametros<P, T>(
  parametros: Signal<P>,
  buscar: (parametros: P) => Observable<T>,
  opcoes: OpcoesDeCarregamento = {},
): Carregamento<T> {
  const usuario = opcoes.cache ? inject(AuthService).usuario : null;
  const chaveDe = (valor: P) => `${opcoes.cache}|${usuario?.()?.id}|${JSON.stringify(valor)}`;
  const dados = signal<T | undefined>(undefined);
  const carregando = signal(true);
  const erro = signal<string | null>(null);
  const versao = signal(0);
  const gatilho = computed(() => ({ parametros: parametros(), versao: versao() }));

  toObservable(gatilho)
    .pipe(
      tap(({ parametros: valor }) => {
        carregando.set(true);
        erro.set(null);
        const guardado = opcoes.cache ? resultadosGuardados.obter(chaveDe(valor)) : undefined;
        if (guardado !== undefined) {
          dados.set(guardado as T);
        }
      }),
      switchMap(({ parametros: valor }) =>
        buscar(valor).pipe(
          tap((resultado) => opcoes.cache && resultadosGuardados.guardar(chaveDe(valor), resultado)),
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
