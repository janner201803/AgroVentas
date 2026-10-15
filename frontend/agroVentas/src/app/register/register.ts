import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

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

  email = '';
  password = '';
  confirmarPassword = '';
  error = '';
  cargando = false;

  async registrar(): Promise<void> {
    if (this.cargando) return;

    this.error = '';

    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    if (this.password !== this.confirmarPassword) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }

    this.cargando = true;

    try {
      await this.authService.registrar(
        this.email.trim(),
        this.password
      );

      await this.router.navigate(['/inicio']);
    } catch (error: any) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          this.error = 'Este correo ya está registrado.';
          break;
        case 'auth/invalid-email':
          this.error = 'Ingresa un correo electrónico válido.';
          break;
        case 'auth/weak-password':
          this.error = 'La contraseña es demasiado débil.';
          break;
        default:
          this.error = 'No fue posible crear la cuenta. Intenta nuevamente.';
      }
    } finally {
      this.cargando = false;
    }
  }
}
