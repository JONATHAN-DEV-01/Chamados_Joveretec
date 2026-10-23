import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiErro } from '../api/api-erro';
import { AuthService } from './auth.service';

/**
 * Para chamadas à API: anexa o JWT, converte erros em {@link ApiErro} e, se o token
 * for recusado (401), encerra a sessão e leva ao login preservando a rota atual.
 */
export const apiInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  if (!requisicao.url.startsWith(environment.apiUrl)) {
    return proximo(requisicao);
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const autenticada = token ? requisicao.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : requisicao;

  return proximo(autenticada).pipe(
    catchError((erro: unknown) => {
      if (!(erro instanceof HttpErrorResponse)) {
        return throwError(() => erro);
      }
      if (erro.status === 401 && token) {
        auth.encerrar();
        void router.navigate(['/login'], { queryParams: { sessao: 'expirada', retorno: router.url } });
      }
      return throwError(() => ApiErro.de(erro));
    }),
  );
};
