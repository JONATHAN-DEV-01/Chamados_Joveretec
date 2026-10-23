/**
 * Ambiente de produção. `API_URL` é injetada no build por `scripts/build-producao.mjs`
 * (opção `define` do Angular) a partir da variável de ambiente `API_URL` — nunca fixa no código.
 */
declare const API_URL: string;

export const environment = {
  production: true,
  apiUrl: API_URL,
};
