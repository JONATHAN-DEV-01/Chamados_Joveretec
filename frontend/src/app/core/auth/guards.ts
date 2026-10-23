import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { NotificacaoService } from '../notificacao/notificacao.service';
import { AuthService } from './auth.service';

/** Exige sessão válida; senão vai ao login guardando a rota pedida. */
export const autenticadoGuard: CanActivateFn = (_rota, estado) => {
  if (inject(AuthService).autenticado()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], { queryParams: { retorno: estado.url } });
};

/** Exige perfil ADMIN (o backend também valida; isto só evita telas inúteis). */
export const adminGuard: CanActivateFn = () => {
  if (inject(AuthService).isAdmin()) {
    return true;
  }
  inject(NotificacaoService).erro('Esta área é restrita a administradores.');
  return inject(Router).createUrlTree(['/dashboard']);
};

/** Quem já está logado não precisa ver o login. */
export const visitanteGuard: CanActivateFn = () =>
  inject(AuthService).autenticado() ? inject(Router).createUrlTree(['/dashboard']) : true;
