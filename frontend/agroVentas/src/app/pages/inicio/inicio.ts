
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio {
  private authService = inject(AuthService);
  private router = inject(Router);

  usuario = this.authService.usuario;
  cerrandoSesion = false;
  errorSesion = '';

  totalVariedades = 8;

  get esAdministrador(): boolean {
    return this.authService.esAdministrador();
  }

  async cerrarSesion(): Promise<void> {
    if (this.cerrandoSesion) return;

    this.cerrandoSesion = true;
    this.errorSesion = '';

    try {
      await this.authService.cerrarSesion();
      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      this.errorSesion =
        'No fue posible cerrar la sesión. Intenta de nuevo.';
    } finally {
      this.cerrandoSesion = false;
    }
  }
}
