import { Injectable, signal } from '@angular/core';
import {createUserWithEmailAndPassword,onAuthStateChanged,signInWithEmailAndPassword,signOut,User} from 'firebase/auth';
import { auth } from '../services/firebase.config';

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
    this.primeraCarga = new Promise<User | null>((resolve) => {
      this.resolverPrimeraCarga = resolve;
    });

    onAuthStateChanged(
      auth,
      usuario => {
        this.usuario.set(usuario);
        this.authCargado.set(true);

        // Resolver la espera solamente con la primera respuesta.
        if (this.resolverPrimeraCarga) {
          this.resolverPrimeraCarga(usuario);
          this.resolverPrimeraCarga = null;
        }
      },
      error => {
        console.error('Error al comprobar la sesión:', error);
        this.authCargado.set(true);

        if (this.resolverPrimeraCarga) {
          this.resolverPrimeraCarga(null);
          this.resolverPrimeraCarga = null;
        }
      }
    );
  }

  async esperarUsuario(): Promise<User | null> {
    if (this.authCargado()) {
      return this.usuario();
    }

    await this.primeraCarga;

    return this.usuario();
  }

  registrar(email: string, password: string) {
    return createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
  }

  iniciarSesion(email: string, password: string) {
    return signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
  }

  cerrarSesion() {
    return signOut(auth);
  }
}