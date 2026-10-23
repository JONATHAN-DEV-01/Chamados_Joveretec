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
      { path: '', pathMatch: 'full', redirectTo: 'chamados' },
      {
        path: 'chamados',
        title: 'Chamados',
        loadComponent: () => import('./features/chamados/lista/lista-chamados').then((m) => m.ListaChamados),
      },
      {
        path: 'chamados/novo',
        title: 'Novo chamado',
        loadComponent: () => import('./features/chamados/novo/novo-chamado').then((m) => m.NovoChamado),
      },
      {
        path: 'chamados/:id',
        title: 'Chamado',
        loadComponent: () => import('./features/chamados/detalhe/detalhe-chamado').then((m) => m.DetalheChamado),
      },
      {
        path: 'fila',
        title: 'Fila do projeto',
        loadComponent: () => import('./features/chamados/fila/fila-projeto').then((m) => m.FilaProjeto),
      },
      {
        path: 'conta',
        title: 'Minha conta',
        loadComponent: () => import('./features/conta/minha-conta').then((m) => m.MinhaConta),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
