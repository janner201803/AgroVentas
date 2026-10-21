
import { Routes } from '@angular/router';

import { Login } from '../app/pages/login/login';
import { Register } from '../app/pages/register/register';
import { Inicio } from '../app/pages/inicio/inicio';
import { Pedidos } from '../app/pages/pedidos/pedidos';
import { Inventario } from '../app/pages/inventario/inventario';
import { authGuard } from '../app/core/guards/auth.guard';
import { adminGuard } from '../app/core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },
  {
    path: 'inicio',
    component: Inicio,
    canActivate: [authGuard]
  },
  {
    path: 'pedidos',
    component: Pedidos,
    canActivate: [authGuard]
  },
  {
    path: 'inventario',
    component: Inventario,
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
