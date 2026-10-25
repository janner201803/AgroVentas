
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);

  nombre = '';
  celular = '';
  email = '';
  password = '';
  confirmarPassword = '';

  error = signal('');
  cargando = signal(false);
  mostrarPassword = signal(false);
  mostrarConfirmarPassword = signal(false);

  alternarPassword(): void {
    this.mostrarPassword.set(!this.mostrarPassword());
  }

  alternarConfirmarPassword(): void {
    this.mostrarConfirmarPassword.set(
      !this.mostrarConfirmarPassword()
    );
  }

  async registrar(): Promise<void> {
    if (this.cargando()) return;

    this.error.set('');

    const nombreLimpio = this.nombre.trim();
    const celularLimpio = this.celular.replace(/\D/g, '');
    const emailLimpio = this.email.trim();

    if (nombreLimpio.length < 3) {
      this.error.set('Ingresa tu nombre completo.');
      return;
    }

    if (!/^\d{10}$/.test(celularLimpio)) {
      this.error.set(
        'Ingresa un número de celular válido de 10 dígitos.'
      );
      return;
    }

    if (this.password.length < 6) {
      this.error.set(
        'La contraseña debe tener al menos 6 caracteres.'
      );
      return;
    }

    if (this.password !== this.confirmarPassword) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    this.cargando.set(true);

    try {
      await this.authService.registrar(
        emailLimpio,
        this.password
      );

      await this.router.navigate(['/inicio']);
    } catch (error: any) {
      switch (error?.code) {
        case 'user_already_exists':
        case 'email_exists':
          this.error.set('Este correo ya está registrado.');
          break;

        case 'email_address_invalid':
        case 'validation_failed':
          this.error.set('Ingresa un correo electrónico válido.');
          break;

        case 'weak_password':
          this.error.set('La contraseña es demasiado débil.');
          break;

        case 'over_request_rate_limit':
        case 'over_email_send_rate_limit':
          this.error.set(
            'Demasiados intentos. Intenta más tarde.'
          );
          break;

        default:
          this.error.set(
            'No fue posible crear la cuenta. Intenta nuevamente.'
          );
      }
    } finally {
      this.cargando.set(false);
    }
  }
}
