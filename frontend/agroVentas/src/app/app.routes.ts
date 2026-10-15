import { Routes } from '@angular/router';

import { Login } from '../app/login/login';
import { Register } from '../app/register/register';
import { Inicio } from '../app/inicio/inicio';
import { authGuard } from './guards/auth.guard';

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
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'inicio'
  }
];