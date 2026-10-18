import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async() => {
  const authService = inject(AuthService);
  const router = inject(Router);

  //Esperar a que supabase restaure la sesión guardada
  //

  const usuario = await authService.esperarUsuario();

  return usuario ? true: router.createUrlTree(['/login'])
}

