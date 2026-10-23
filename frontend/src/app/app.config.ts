import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ConfiguracaoService } from './core/api/configuracao.service';
import { apiInterceptor } from './core/auth/api.interceptor';
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor])),
    { provide: TitleStrategy, useClass: TituloDaPagina },
    provideAppInitializer(inicializar),
  ],
};
