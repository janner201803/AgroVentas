import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-restablecer',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './restablecer.html',
  styleUrls: ['../login/login.css', '../olvide-contrasena/olvide-contrasena.css'],
})
export class Restablecer implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  password = '';
  confirmarPassword = '';

  verificando = signal(true);   // esperando a que Supabase restaure la sesión
  enlaceValido = signal(false); // ¿hay sesión de recuperación?
  error = signal('');
  cargando = signal(false);
  listo = signal(false);
  mostrarPassword = signal(false);

  async ngOnInit(): Promise<void> {
    // Espera a que supabase-js procese el enlace del correo.
    const usuario = await this.authService.esperarUsuario();
    this.enlaceValido.set(!!usuario);
    this.verificando.set(false);
  }

  alternarPassword(): void {
    this.mostrarPassword.set(!this.mostrarPassword());
  }

    // Cierra la sesión temporal de recuperación y lleva al login, para que el
  // usuario entre con la contraseña nueva.
  async irAlLogin(): Promise<void> {
    try {
      await this.authService.cerrarSesion();
    } catch (error) {
      console.error('Error al cerrar la sesión de recuperación:', error);
    }
    await this.router.navigate(['/login']);
  } 

  async guardar(): Promise<void> {
    if (this.cargando()) return;
    this.error.set('');

    if (this.password.length < 6) {
      this.error.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (this.password !== this.confirmarPassword) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    this.cargando.set(true);
    try {
      await this.authService.actualizarContrasena(this.password);
      this.listo.set(true);
    } catch (error: any) {
      switch (error.code) {
        case 'same_password':
          this.error.set('La nueva contraseña debe ser distinta a la actual.');
          break;
        case 'weak_password':
          this.error.set('La contraseña es demasiado débil.');
          break;
        case 'session_not_found':
        case 'not_authenticated':
          this.enlaceValido.set(false);
          break;
        default:
          this.error.set('No pudimos cambiar la contraseña. Intenta nuevamente.');
      }
    } finally {
      this.cargando.set(false);
    }
  }
}