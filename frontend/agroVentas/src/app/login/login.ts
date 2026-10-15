import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  error = '';
  cargando = false;

  async iniciarSesion(): Promise<void> {
    if (this.cargando) return;

    this.error = '';
    this.cargando = true;

    try {
      await this.authService.iniciarSesion(
        this.email.trim(),
        this.password
      );

      await this.router.navigate(['/inicio']);
    } catch (error: any) {
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          this.error = 'Correo o contraseña incorrectos.';
          break;
        case 'auth/invalid-email':
          this.error = 'Ingresa un correo válido.';
          break;
        case 'auth/too-many-requests':
          this.error = 'Demasiados intentos. Intenta más tarde.';
          break;
        default:
          this.error = 'No pudimos iniciar sesión. Intenta nuevamente.';
      }
    } finally {
      this.cargando = false;
    }
  }
}
