import { Injectable, signal, inject } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { supabase } from './supabase.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  usuario = signal<User | null>(null);
  authCargado = signal(false);

  private router = inject(Router);
  private primeraCarga: Promise<User | null>;
  private resolverPrimeraCarga:
    ((usuario: User | null) => void) | null = null;

  // --- Cierre por inactividad ---
  // Cambiar este valor para ajustar el tiempo permitido sin actividad.
  private readonly MINUTOS_INACTIVIDAD = 30;
  private readonly CLAVE_ACTIVIDAD = 'agroventas:ultima-actividad';
  private readonly EVENTOS_ACTIVIDAD = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
  private intervalo: ReturnType<typeof setInterval> | null = null;
  private ultimoRegistro = 0;

  constructor() {
    this.primeraCarga = new Promise<User | null>((resolve) => {
      this.resolverPrimeraCarga = resolve;
    });

    // Supabase avisa en cada cambio de sesión (login, logout, token renovado).
    // Al suscribirse emite además un evento inicial con la sesión guardada en el navegador.
    supabase.auth.onAuthStateChange((evento, sesion) => {
      const usuario = sesion?.user ?? null;

      this.usuario.set(usuario);
      this.authCargado.set(true);

      if (usuario) {
        this.iniciarVigilancia();
      } else {
        this.detenerVigilancia();
      }

      // Resolver la espera solamente con la primera respuesta.
      if (this.resolverPrimeraCarga) {
        this.resolverPrimeraCarga(usuario);
        this.resolverPrimeraCarga = null;
      }

      // Si la sesión se cerró (incluso desde otra pestaña), ir a /login.
      
      if (evento === 'SIGNED_OUT') {
        this.router.navigate(['/login']);
      }
    });
  }

  async esperarUsuario(): Promise<User | null> {
    if (this.authCargado()) {
      return this.usuario();
    }

    await this.primeraCarga;

    return this.usuario();
  }

  async registrar(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password
    });

    if (error) throw error;
    return data;
  }

  async iniciarSesion(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) throw error;
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // ---------------------------------------------------------------
  // Inactividad
  // ---------------------------------------------------------------

  // Guarda la hora de la última actividad en localStorage (compartido entre
  // pestañas). Se limita a una escritura cada 5 s para no escribir en cada
  // movimiento del mouse.
  private registrarActividad = () => {
    const ahora = Date.now();
    if (ahora - this.ultimoRegistro < 5000) return;
    this.ultimoRegistro = ahora;
    try { localStorage.setItem(this.CLAVE_ACTIVIDAD, String(ahora)); } catch {}
  };

  private haExpirado(): boolean {
    try {
      const ultima = Number(localStorage.getItem(this.CLAVE_ACTIVIDAD) ?? 0);
      return ultima > 0 &&
        Date.now() - ultima > this.MINUTOS_INACTIVIDAD * 60_000;
    } catch {
      return false;
    }
  }

  private iniciarVigilancia() {
    if (this.intervalo) return; // onAuthStateChange puede emitir varias veces

    // Se comprueba ANTES de registrar actividad: si el usuario volvió tras
    // días con la pestaña cerrada, la sesión guardada ya no debe valer.
    if (this.haExpirado()) {
      this.cerrarPorInactividad();
      return;
    }

    this.registrarActividad();
    this.EVENTOS_ACTIVIDAD.forEach(e =>
      window.addEventListener(e, this.registrarActividad, { passive: true })
    );
    // Se revisa cada 30 s. Un intervalo es más fiable que un setTimeout largo,
    // que se retrasa si el equipo se suspende.
    this.intervalo = setInterval(() => {
      if (this.haExpirado()) this.cerrarPorInactividad();
    }, 30_000);
  }

  private detenerVigilancia() {
    if (this.intervalo) clearInterval(this.intervalo);
    this.intervalo = null;
    this.EVENTOS_ACTIVIDAD.forEach(e =>
      window.removeEventListener(e, this.registrarActividad)
    );
    // Se borra para que un login nuevo no herede una marca vieja.
    try { localStorage.removeItem(this.CLAVE_ACTIVIDAD); } catch {}
  }

  private cerrarPorInactividad() {
    // setTimeout(0): no conviene llamar a otras funciones de Supabase
    // directamente dentro del callback de onAuthStateChange.
    setTimeout(async () => {
      try {
        await this.cerrarSesion();
      } catch (error) {
        console.error('Error al cerrar sesión por inactividad:', error);
      }
      await this.router.navigate(['/login']);
    }, 0);
  }
}