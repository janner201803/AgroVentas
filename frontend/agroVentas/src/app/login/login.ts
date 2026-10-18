import { Component, inject, signal } from '@angular/core';
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

  // se cambiaron a signals para que la vista se actualice automáticamente cuando cambien sus valores

  error = signal('');
  cargando = signal(false);

  
    async iniciarConGoogle(): Promise<void> {
    this.error.set('');
    try {
      await this.authService.iniciarSesionConGoogle();
    } catch {
      this.error.set('No pudimos conectar con Google. Intenta nuevamente.');
    }
  }

  async iniciarSesion(): Promise<void> {
    if (this.cargando()) return;

    this.error.set('');
    this.cargando.set(true);

    try {
      await this.authService.iniciarSesion(
        this.email.trim(),
        this.password
      );

      await this.router.navigate(['/inicio']);
    } catch (error: any) {
      console.log('Error de login:', error.code, error.status, error.message);
      switch (error.code) {
        // Supabase no distingue "usuario inexistente" de "contraseña mala"
        // a propósito, para no revelar qué correos están registrados.
        case 'invalid_credentials':
          this.error.set('Correo o contraseña incorrectos.');
          break;
        case 'email_address_invalid':
        case 'validation_failed':
          this.error.set('Ingresa un correo válido.');
          break;
        case 'over_request_rate_limit':
          this.error.set('Demasiados intentos. Intenta más tarde.');
          break;
        default:
          this.error.set('No pudimos iniciar sesión. Intenta nuevamente.');
      }
    } finally {
      this.cargando.set(false);
    }
  }
}
