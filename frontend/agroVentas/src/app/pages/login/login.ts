
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

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

  error = signal('');
  cargando = signal(false);
  mostrarPassword = signal(false);

  alternarPassword(): void {
    this.mostrarPassword.set(!this.mostrarPassword());
  }

  async iniciarConGoogle(): Promise<void> {
    this.error.set('');

    try {
      await this.authService.iniciarSesionConGoogle();
    } catch {
      this.error.set(
        'No pudimos conectar con Google. Intenta nuevamente.'
      );
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
      switch (error.code) {
        case 'invalid_credentials':
          this.error.set('Correo o contraseña incorrectos.');
          break;

        case 'email_address_invalid':
        case 'validation_failed':
          this.error.set('Ingresa un correo válido.');
          break;

        case 'over_request_rate_limit':
          this.error.set(
            'Demasiados intentos. Intenta más tarde.'
          );
          break;

        default:
          this.error.set(
            'No pudimos iniciar sesión. Intenta nuevamente.'
          );
      }
    } finally {
      this.cargando.set(false);
    }
  }
}
