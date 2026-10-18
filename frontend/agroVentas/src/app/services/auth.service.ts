import { Injectable, signal } from '@angular/core';
import {User} from '@supabase/supabase-js';
import { supabase }  from './supabase.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  usuario = signal<User | null>(null);
  authCargado = signal(false);

  private primeraCarga: Promise<User | null>;

  private resolverPrimeraCarga:
    ((usuario: User | null) => void) | null = null;

  constructor() {
    this.primeraCarga = new Promise<User | null>((resolve) =>{
      this.resolverPrimeraCarga = resolve;
    })

    // Supabase avisa en cada cambio de sesión (login, logout, token renovado).
    // Al suscribirse emite además un evento inicial con la sesión guardada
    // en el navegador, que equivale a la primera respuesta de Firebase.

    supabase.auth.onAuthStateChange((_evento, sesion)=> {
      const usuario = sesion?.user ?? null;

      this.usuario.set(usuario);
      this.authCargado.set(true)

      //resolver la espera solamente con la primera respuesta
      if(this.resolverPrimeraCarga){
        this.resolverPrimeraCarga(usuario);
        this.resolverPrimeraCarga = null;
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

  async cerrarSesion() {
    const {error} = await supabase.auth.signOut();
    if(error) throw error;
  }
}


  

  

