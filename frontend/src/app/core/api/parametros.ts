import { HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

type ValorParametro = string | number | boolean | readonly (string | number)[] | null | undefined;

/** URL absoluta de um recurso da API (`/api/...`). */
export function urlApi(caminho: string): string {
  return `${environment.apiUrl}/api${caminho}`;
}

/**
 * Monta query params ignorando valores vazios. Listas viram parâmetros repetidos
 * (`?status=A&status=B`), formato aceito pelo backend.
 */
export function parametros(valores: Record<string, ValorParametro>): HttpParams {
  let params = new HttpParams();
  for (const [chave, valor] of Object.entries(valores)) {
    if (valor === null || valor === undefined || valor === '' || valor === false) {
      continue;
    }
    if (Array.isArray(valor)) {
      valor.forEach((item) => (params = params.append(chave, String(item))));
    } else {
      params = params.set(chave, String(valor));
    }
  }
  return params;
}
