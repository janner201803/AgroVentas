
import { Routes } from '@angular/router';
import { OlvideContrasena } from '../app/pages/olvide-contrasena/olvide-contrasena';
import { authGuard } from '../app/core/guards/auth.guard';
import { rolGuard } from '../app/core/guards/rol.guard';
import { Restablecer } from '../app/pages/restablecer/restablecer';

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
    path: 'recuperar-contrasena',
    loadComponent: () => import('../app/pages/olvide-contrasena/olvide-contrasena').then(modulo => modulo.OlvideContrasena)
  },
  {
    path: 'restablecer',
    loadComponent: () => import('../app/pages/restablecer/restablecer').then(modulo => modulo.Restablecer)
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
    path: 'mis-pedidos',
    loadComponent: () => import('../app/pages/mis-pedidos/mis-pedidos').then(modulo => modulo.MisPedidos),
    canActivate: [authGuard]
  },
  {
    path: 'inventario',
    loadComponent: () => import('../app/pages/inventario/inventario').then(modulo => modulo.Inventario),
    canActivate: [rolGuard('propietario', 'empleado')]
  },
  {
    path: 'gestion-pedidos',
    loadComponent: () => import('../app/pages/gestion-pedidos/gestion-pedidos').then(modulo => modulo.GestionPedidos),
    canActivate: [rolGuard('propietario', 'empleado')]
  },
  {
    path: 'ventas',
    loadComponent: () => import('./pages/ventas/ventas').then(m => m.Ventas),
    canActivate: [rolGuard('propietario', 'empleado')]
  },
  {
    path: 'cartera',
    loadComponent: () => import('./pages/cartera/cartera').then(m => m.Cartera),
    canActivate: [rolGuard('propietario', 'empleado')]
  },
  {
    path: 'clientes',
    loadComponent: () => import('./pages/clientes/clientes').then(m => m.Clientes),
    canActivate: [rolGuard('propietario', 'empleado')]
  },
  {
    path: 'usuarios',
    loadComponent: () => import('../app/pages/usuarios/usuarios').then(modulo => modulo.Usuarios),
    canActivate: [rolGuard('propietario')]
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
