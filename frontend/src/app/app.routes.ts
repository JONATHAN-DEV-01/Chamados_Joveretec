import { Routes } from '@angular/router';
import { adminGuard, autenticadoGuard, visitanteGuard } from './core/auth/guards';
import { enviosPendentesGuard } from './core/envio/envios-pendentes.guard';

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
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'chamados',
        title: 'Chamados',
        loadComponent: () => import('./features/chamados/lista/lista-chamados').then((m) => m.ListaChamados),
      },
      {
        path: 'chamados/novo',
        title: 'Novo chamado',
        canDeactivate: [enviosPendentesGuard],
        loadComponent: () => import('./features/chamados/novo/novo-chamado').then((m) => m.NovoChamado),
      },
      {
        path: 'chamados/:id',
        title: 'Chamado',
        canDeactivate: [enviosPendentesGuard],
        loadComponent: () => import('./features/chamados/detalhe/detalhe-chamado').then((m) => m.DetalheChamado),
      },
      {
        path: 'fila',
        title: 'Fila do projeto',
        loadComponent: () => import('./features/chamados/fila/fila-projeto').then((m) => m.FilaProjeto),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'projetos' },
          {
            path: 'projetos',
            title: 'Projetos',
            loadComponent: () => import('./features/admin/projetos/admin-projetos').then((m) => m.AdminProjetos),
          },
          {
            path: 'usuarios',
            title: 'Usuários',
            loadComponent: () => import('./features/admin/usuarios/admin-usuarios').then((m) => m.AdminUsuarios),
          },
          {
            path: 'configuracoes',
            title: 'Configurações',
            loadComponent: () =>
              import('./features/admin/configuracoes/admin-configuracoes').then((m) => m.AdminConfiguracoes),
          },
        ],
      },
      {
        path: 'perfil',
        title: 'Meu perfil',
        loadComponent: () => import('./features/perfil/meu-perfil').then((m) => m.MeuPerfil),
      },
      // "Minha conta" (dados e senha) passou a fazer parte de "Meu perfil".
      { path: 'conta', redirectTo: 'perfil' },
    ],
  },
  { path: '**', redirectTo: '' },
];
