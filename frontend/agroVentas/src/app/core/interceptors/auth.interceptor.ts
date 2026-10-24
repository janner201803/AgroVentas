    import { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap, timeout } from 'rxjs';
import { supabase } from '../services/supabase.config';

const API_URL = 'http://localhost:3001/api';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo se agrega el token a las peticiones hacia tu backend
  if (!req.url.startsWith(API_URL)) {
    return next(req);
  }

  return from(supabase.auth.getSession()).pipe(
    // No dejar una solicitud de API pendiente si la lectura de sesión se atasca.
    timeout({ first: 10_000 }),
    switchMap(({ data }) => {
      const token = data.session?.access_token;

      const peticion = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

      return next(peticion);
    })
  );
};
