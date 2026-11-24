import { API_URL } from '../api.config';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { Rol } from './auth.service';

/** HU-21: cuenta tal como la ve el Propietario (tabla public.perfiles). */
export interface UsuarioSistema {
  id: string;
  correo: string | null;
  nombre: string | null;
  celular: string | null;
  rol: Rol;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

export interface CambioUsuario {
  rol?: Rol;
  activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);
  private readonly url = `${API_URL}/usuarios`;

  listar(): Observable<UsuarioSistema[]> {
    return this.http.get<UsuarioSistema[]>(this.url).pipe(timeout({ first: 15_000 }));
  }

  actualizar(id: string, cambios: CambioUsuario): Observable<UsuarioSistema> {
    return this.http
      .patch<{ mensaje: string; usuario: UsuarioSistema }>(`${this.url}/${encodeURIComponent(id)}`, cambios)
      .pipe(timeout({ first: 15_000 }), map(respuesta => respuesta.usuario));
  }
}
