import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';

export const ATRASO_BUSCA_MS = 350;

/** Texto do campo de busca com debounce, como signal (evita uma requisição por tecla). */
export function buscaComAtraso(campo: FormControl<string>): Signal<string> {
  return toSignal(
    campo.valueChanges.pipe(
      debounceTime(ATRASO_BUSCA_MS),
      map((texto) => texto.trim()),
      distinctUntilChanged(),
    ),
    { initialValue: campo.value.trim() },
  );
}
