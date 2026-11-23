import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-encabezado-seccion',
  imports: [RouterLink],
  templateUrl: './encabezado-seccion.html',
  styleUrl: './encabezado-seccion.css'
})
export class EncabezadoSeccion {
  titulo = input.required<string>();
  auth = inject(AuthService);
  private router = inject(Router);
  cerrandoSesion = signal(false);
  error = signal('');
  async cerrarSesion() {
    this.cerrandoSesion.set(true);
    try {
      await this.auth.cerrarSesion();
      await this.router.navigate(['/login']);
    } catch {
      this.error.set('No fue posible cerrar la sesión.');
    } finally { this.cerrandoSesion.set(false); }
  }
}
