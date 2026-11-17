import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Rol } from '../services/auth.service';

/**
 * HU-01: deja pasar solo a usuarios activos con alguno de los roles indicados.
 * Sin sesión redirige a /login; con otro rol, a /inicio.
 * Uso en rutas: canActivate: [rolGuard('propietario')]
 */
export const rolGuard = (...roles: Rol[]): CanActivateFn => async () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const usuario = await authService.esperarUsuario();

  if (!usuario) return router.createUrlTree(['/login']);
  return authService.tieneRol(...roles) ? true : router.createUrlTree(['/inicio']);
};
