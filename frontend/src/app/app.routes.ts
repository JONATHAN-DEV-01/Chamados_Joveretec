import { Routes } from '@angular/router';
import { autenticadoGuard, visitanteGuard } from './core/auth/guards';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Entrar',
    canActivate: [visitanteGuard],
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [autenticadoGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'conta' },
      {
        path: 'conta',
        title: 'Minha conta',
        loadComponent: () => import('./features/conta/minha-conta').then((m) => m.MinhaConta),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
