
import { Routes } from '@angular/router';

import { authGuard } from '../app/core/guards/auth.guard';
import { adminGuard } from '../app/core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('../app/pages/login/login').then(modulo => modulo.Login)
  },
  {
    path: 'register',
    loadComponent: () => import('../app/pages/register/register').then(modulo => modulo.Register)
  },
  {
    path: 'inicio',
    loadComponent: () => import('../app/pages/inicio/inicio').then(modulo => modulo.Inicio),
    canActivate: [authGuard]
  },
  {
    path: 'pedidos',
    loadComponent: () => import('../app/pages/pedidos/pedidos').then(modulo => modulo.Pedidos),
    canActivate: [authGuard]
  },
  {
    path: 'inventario',
    loadComponent: () => import('../app/pages/inventario/inventario').then(modulo => modulo.Inventario),
    canActivate: [adminGuard]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
