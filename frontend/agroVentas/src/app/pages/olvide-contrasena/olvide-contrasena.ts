import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service'; // ajusta la ruta

@Component({
  selector: 'app-olvide-contrasena',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './olvide-contrasena.html',
    styleUrls: ['../login/login.css', './olvide-contrasena.css'], // reutiliza los estilos del login
})
export class OlvideContrasena {
  private authService = inject(AuthService);

  email = '';
  error = signal('');
  enviado = signal(false);
  cargando = signal(false);

  async enviar(): Promise<void> {
    if (this.cargando()) return;

    this.error.set('');
    this.cargando.set(true);

    try {
      await this.authService.enviarCorreoRecuperacion(this.email);
      this.enviado.set(true);
    } catch (error: any) {
      switch (error.code) {
        case 'over_email_send_rate_limit':
        case 'over_request_rate_limit':
          this.error.set('Demasiados intentos. Espera unos minutos.');
          break;
        case 'email_address_invalid':
        case 'validation_failed':
          this.error.set('Ingresa un correo válido.');
          break;
        default:
          this.error.set('No pudimos enviar el correo. Intenta nuevamente.');
      }
    } finally {
      this.cargando.set(false);
    }
  }
}