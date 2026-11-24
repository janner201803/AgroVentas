import { Routes } from '@angular/router';
import { OlvideContrasena } from '../app/pages/olvide-contrasena/olvide-contrasena';
import { authGuard } from '../app/core/guards/auth.guard';
import { rolGuard } from '../app/core/guards/rol.guard';
import { Restablecer } from '../app/pages/restablecer/restablecer';

export const routes: Routes = [
  // ───── Rutas públicas (sin layout) ─────
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

  // ───── Rutas con sesión (comparten el Layout) ─────
  // El `data` de cada ruta es el título que el Layout muestra en la cabecera.
  {
    path: '',
    loadComponent: () => import('../app/pages/layout/layout').then(modulo => modulo.Layout),
    canActivate: [authGuard],
    children: [
      {
        path: 'inicio',
        loadComponent: () => import('../app/pages/inicio/inicio').then(modulo => modulo.Inicio),
        canActivate: [authGuard],
        data: {
          etiqueta: 'DIRECTO DEL CAMPO A TU MESA',
          titulo: '¡Conoce nuestras piñas!'
        }
      },
      {
        path: 'pedidos',
        loadComponent: () => import('../app/pages/pedidos/pedidos').then(modulo => modulo.Pedidos),
        canActivate: [authGuard],
        data: {
          etiqueta: 'COORDINA TU RECOGIDA',
          titulo: 'Haz tu pedido de piña'
        }
      },
      {
        path: 'mis-pedidos',
        loadComponent: () => import('../app/pages/mis-pedidos/mis-pedidos').then(modulo => modulo.MisPedidos),
        canActivate: [authGuard],
        data: {
          titulo: 'Mis pedidos',
          subtitulo: 'Consulta el estado de tus pedidos y los datos de recogida.'
        }
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
        path: 'pedido-interno',
        loadComponent: () => import('../app/pages/pedido-interno/pedido-interno').then(modulo => modulo.PedidoInterno),
        canActivate: [rolGuard('propietario', 'empleado')],
        data: { titulo: 'Registrar pedido interno' }
      },
      {
        path: 'usuarios',
        loadComponent: () => import('../app/pages/usuarios/usuarios').then(modulo => modulo.Usuarios),
        canActivate: [rolGuard('propietario')]
      }
    ]
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
    path: 'reportes',
    loadComponent: () => import('./pages/reportes/reportes').then(m => m.Reportes),
    canActivate: [rolGuard('propietario')],
    data: { titulo: 'Tablero y reportes' }
  },
  {
    path: 'mis-compras',
    loadComponent: () => import('./pages/mis-compras/mis-compras').then(m => m.MisCompras),
    canActivate: [rolGuard('cliente')]
  },
  {
    path: 'clientes',
    loadComponent: () => import('./pages/clientes/clientes').then(m => m.Clientes),
    canActivate: [rolGuard('propietario', 'empleado')]
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
