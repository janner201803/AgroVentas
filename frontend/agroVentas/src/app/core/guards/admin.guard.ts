import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const usuario = await authService.esperarUsuario();

  if (!usuario) return router.createUrlTree(['/login']);
  return authService.esAdministrador(usuario) ? true : router.createUrlTree(['/inicio']);
};
