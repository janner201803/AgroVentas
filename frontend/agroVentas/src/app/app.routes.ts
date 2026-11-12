
import { Routes } from '@angular/router';
import { OlvideContrasena } from '../app/pages/olvide-contrasena/olvide-contrasena';
import { authGuard } from '../app/core/guards/auth.guard';
import { adminGuard } from '../app/core/guards/admin.guard';
import { Restablecer } from '../app/pages/restablecer/restablecer';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión · AgroVentas',
    loadComponent: () => import('../app/pages/login/login').then(modulo => modulo.Login)
  },
  {
    path: 'register',
    title: 'Crear cuenta · AgroVentas',
    loadComponent: () => import('../app/pages/register/register').then(modulo => modulo.Register)
  },
  {
    path: 'recuperar-contrasena',
    title: 'Recuperar contraseña · AgroVentas',
    loadComponent: () => import('../app/pages/olvide-contrasena/olvide-contrasena').then(modulo => modulo.OlvideContrasena)
  },
  {
    path: 'restablecer',
    title: 'Restablecer contraseña · AgroVentas',
    loadComponent: () => import('../app/pages/restablecer/restablecer').then(modulo => modulo.Restablecer)
  },
  {
    path: 'inicio',
    title: 'Inicio · AgroVentas',
    loadComponent: () => import('../app/pages/inicio/inicio').then(modulo => modulo.Inicio),
    canActivate: [authGuard]
  },
  {
    path: 'pedidos',
    title: 'Hacer pedido · AgroVentas',
    loadComponent: () => import('../app/pages/pedidos/pedidos').then(modulo => modulo.Pedidos),
    canActivate: [authGuard]
  },
  {
    path: 'mis-pedidos',
    title: 'Mis pedidos · AgroVentas',
    loadComponent: () => import('../app/pages/mis-pedidos/mis-pedidos').then(modulo => modulo.MisPedidos),
    canActivate: [authGuard]
  },
  {
    path: 'inventario',
    title: 'Inventario · AgroVentas',
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
