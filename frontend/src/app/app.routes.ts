import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [],
  },
  { path: '**', redirectTo: '' },
];
