import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { CarregamentoService, SEM_INDICADOR } from './carregamento.service';

/** Toda requisição HTTP conta para o indicador global de carregamento (exceto as marcadas com SEM_INDICADOR). */
export const carregamentoInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  if (requisicao.context.get(SEM_INDICADOR)) {
    return proximo(requisicao);
  }
  const encerrar = inject(CarregamentoService).iniciar();
  return proximo(requisicao).pipe(finalize(encerrar));
};
