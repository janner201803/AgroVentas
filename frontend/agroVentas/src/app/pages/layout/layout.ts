import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

/** Textos del título que cada ruta define en su `data` (ver app.routes). */
interface CabeceraPagina {
  etiqueta?: string;
  titulo?: string;
  subtitulo?: string;
}

/**
 * Estructura común de todas las pantallas con sesión:
 * menú lateral con el logo a la izquierda y, a la derecha, la barra superior
 * (título de la página + cuenta) con el contenido de cada página debajo.
 */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {
  private authService = inject(AuthService);
  private router = inject(Router);

  usuario = this.authService.usuario;
  etiquetaRol = this.authService.etiquetaRol;
  cerrandoSesion = false;
  errorSesion = '';

  /** Título, subtítulo y línea naranja de la página que se está mostrando. */
  cabecera = toSignal(
    this.router.events.pipe(
      filter(evento => evento instanceof NavigationEnd),
      startWith(null),
      map(() => this.datosRutaActual())
    ),
    { initialValue: {} as CabeceraPagina }
  );

  private datosRutaActual(): CabeceraPagina {
    let ruta = this.router.routerState.snapshot.root;
    while (ruta.firstChild) ruta = ruta.firstChild;
    return (ruta.data as CabeceraPagina) ?? {};
  }

  get esAdministrador(): boolean {
    return this.authService.esAdministrador();
  }

  get esPersonal(): boolean {
    return this.authService.esPersonal();
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
      this.errorSesion = 'No fue posible cerrar la sesión. Intenta de nuevo.';
    } finally {
      this.cerrandoSesion = false;
    }
  }
}