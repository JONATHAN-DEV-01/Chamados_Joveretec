import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ConfiguracaoService } from './core/api/configuracao.service';
import { apiInterceptor } from './core/auth/api.interceptor';
import { carregamentoInterceptor } from './core/carregamento/carregamento.interceptor';
import { AuthService } from './core/auth/auth.service';
import { TituloDaPagina } from './core/titulo-da-pagina';
import { routes } from './app.routes';

/** Antes da primeira tela: aplica a paleta e, se houver sessão, sincroniza o usuário (perfil pode ter mudado). */
function inicializar() {
  const auth = inject(AuthService);
  return forkJoin([
    inject(ConfiguracaoService).carregar(),
    auth.autenticado() ? auth.recarregarUsuario().pipe(catchError(() => of(null))) : of(null),
  ]);
}

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([carregamentoInterceptor, apiInterceptor])),
    { provide: TitleStrategy, useClass: TituloDaPagina },
    provideAppInitializer(inicializar),
  ],
};
