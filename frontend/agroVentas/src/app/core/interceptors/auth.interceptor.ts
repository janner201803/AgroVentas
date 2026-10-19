    import { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { supabase } from '../services/supabase.config';

const API_URL = 'http://localhost:3001/api';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo se agrega el token a las peticiones hacia tu backend
  if (!req.url.startsWith(API_URL)) {
    return next(req);
  }

  return from(supabase.auth.getSession()).pipe(
    switchMap(({ data }) => {
      const token = data.session?.access_token;

      const peticion = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

      return next(peticion);
    })
  );
};