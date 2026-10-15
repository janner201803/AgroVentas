import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '../services/firebase.config';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  return new Promise<boolean | ReturnType<Router['createUrlTree']>>(
    resolve => {
      const unsubscribe = onAuthStateChanged(
        auth,
        usuario => {
          unsubscribe();

          resolve(
            usuario
              ? true
              : router.createUrlTree(['/login'])
          );
        },
        error => {
          console.error('Error al comprobar la sesión:', error);
          unsubscribe();

          resolve(router.createUrlTree(['/login']));
        }
      );
    }
  );
};