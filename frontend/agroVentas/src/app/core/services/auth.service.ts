import { Injectable, signal } from '@angular/core';
import {User} from '@supabase/supabase-js';
import { supabase }  from './supabase.config';

export const ADMIN_EMAIL = 'admin@gmail.com';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  usuario = signal<User | null>(null);
  authCargado = signal(false);

  constructor() {
    supabase.auth.onAuthStateChange((evento, sesion)=> {
      const usuario = sesion?.user ?? null;

      this.usuario.set(usuario);
      this.authCargado.set(true);

      if (evento === 'SIGNED_IN') {
        console.info('[AgroVentas] Sesión iniciada', {
          autenticado: Boolean(sesion?.access_token),
          expiraEn: sesion?.expires_at
            ? new Date(sesion.expires_at * 1000).toLocaleString()
            : 'desconocido'
        });
      }
    });
  }

  async esperarUsuario(): Promise<User | null> {
    // getUser valida el token con Supabase; getSession/onAuthStateChange
    // solo restauran el estado local del navegador.
    let usuario: User | null = null;
    try {
      const { data, error } = await supabase.auth.getUser();
      usuario = error ? null : data.user;
    } catch {
      // Si no se puede validar la sesión, se deniega la navegación protegida.
      usuario = null;
    }
    this.usuario.set(usuario);
    this.authCargado.set(true);
    return usuario;
  }

  esAdministrador(usuario: User | null = this.usuario()): boolean {
    return usuario?.email?.trim().toLowerCase() === ADMIN_EMAIL;
  }

  async registrar(email: string, password: string) {
    const {data, error} = await supabase.auth.signUp({
      email: email.trim(),
      password: password
    });

    if(error) throw error;
    return data;
  }

  async iniciarSesion(email: string, password: string) {
    const {data, error} = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if(error) throw error;
    return data;
  }

  // Redirige al usuario a Google. No devuelve sesión: al volver a la app,
  // onAuthStateChange la detecta solo, así que el guard no cambia.
  async iniciarSesionConGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/inicio` }
    });
    if (error) throw error;
  }

  async cerrarSesion() {
    const {error} = await supabase.auth.signOut();
    if(error) throw error;
  }
}


  

  

