import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * Encabezado y menú únicos de las páginas internas (DESIGN.md, "Estructura de página").
 * La página que lo usa debe marcar su contenido con id="contenido" y tabindex="-1"
 * para que funcione el enlace "Saltar al contenido".
 */
@Component({
  selector: 'app-encabezado',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './encabezado.html',
  styleUrl: './encabezado.css'
})
export class Encabezado {
  private authService = inject(AuthService);
  private router = inject(Router);

  usuario = this.authService.usuario;
  cerrandoSesion = signal(false);
  errorSesion = signal('');

  get esAdministrador(): boolean {
    return this.authService.esAdministrador();
  }

  saltarAlContenido(evento: Event): void {
    evento.preventDefault();
    document.getElementById('contenido')?.focus();
  }

  async cerrarSesion(): Promise<void> {
    if (this.cerrandoSesion()) return;

    this.cerrandoSesion.set(true);
    this.errorSesion.set('');

    try {
      await this.authService.cerrarSesion();
      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      this.errorSesion.set('No se pudo cerrar la sesión. Intenta de nuevo.');
    } finally {
      this.cerrandoSesion.set(false);
    }
  }
}
