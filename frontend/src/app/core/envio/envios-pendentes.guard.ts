import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { EnviosAtivos } from './fila-de-envios';

/** Pede confirmação antes de sair de uma tela com envio de arquivo em andamento. */
export const enviosPendentesGuard: CanDeactivateFn<unknown> = () =>
  !inject(EnviosAtivos).emAndamento() ||
  globalThis.confirm('Há arquivos sendo enviados. Se sair agora, o envio será interrompido. Sair mesmo assim?');
