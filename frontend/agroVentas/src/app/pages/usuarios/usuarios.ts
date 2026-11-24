import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TimeoutError } from 'rxjs';

import { AuthService, Rol } from '../../core/services/auth.service';
import { CambioUsuario, UsuarioService, UsuarioSistema } from '../../core/services/usuario.service';

export type FiltroRol = 'todos' | Rol | 'inactivos';

export const NOMBRE_ROL: Record<Rol, string> = {
  propietario: 'Propietario',
  empleado: 'Empleado',
  cliente: 'Cliente'
};

/** HU-21: el Propietario consulta las cuentas, asigna roles y activa o desactiva accesos. */
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css']
})
export class Usuarios implements OnInit {
  private usuarioService = inject(UsuarioService);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly roles: Rol[] = ['propietario', 'empleado', 'cliente'];
  readonly nombreRol = NOMBRE_ROL;
  readonly filtros: { valor: FiltroRol; etiqueta: string }[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'propietario', etiqueta: 'Propietarios' },
    { valor: 'empleado', etiqueta: 'Empleados' },
    { valor: 'cliente', etiqueta: 'Clientes' },
    { valor: 'inactivos', etiqueta: 'Inactivos' }
  ];

  usuario = this.authService.usuario;
  usuarios = signal<UsuarioSistema[]>([]);
  cargando = signal(true);
  error = signal('');
  mensaje = signal('');
  /** Ids de las cuentas que se están guardando. */
  guardando = signal<ReadonlySet<string>>(new Set());
  filtro = signal<FiltroRol>('todos');
  busqueda = signal('');
  cerrandoSesion = signal(false);
  readonly usuariosPorPagina = 6;
  paginaActual = signal(1);

  usuariosFiltrados = computed(() => {
    const termino = normalizar(this.busqueda());
    const filtro = this.filtro();
    return this.usuarios()
      .filter(u => coincideFiltro(u, filtro))
      .filter(u => !termino || [u.correo, u.nombre, u.celular].some(valor => normalizar(valor).includes(termino)))
      .sort(compararUsuarios);
  });

  totalPaginas = computed(() => Math.max(1, Math.ceil(this.usuariosFiltrados().length / this.usuariosPorPagina)));
  usuariosPagina = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.usuariosPorPagina;
    return this.usuariosFiltrados().slice(inicio, inicio + this.usuariosPorPagina);
  });
  desdeUsuario = computed(() => this.usuariosFiltrados().length ? (this.paginaActual() - 1) * this.usuariosPorPagina + 1 : 0);
  hastaUsuario = computed(() => Math.min(this.paginaActual() * this.usuariosPorPagina, this.usuariosFiltrados().length));

  contadores = computed(() => {
    const lista = this.usuarios();
    return Object.fromEntries(
      this.filtros.map(({ valor }) => [valor, lista.filter(u => coincideFiltro(u, valor)).length])
    ) as Record<FiltroRol, number>;
  });

  ngOnInit(): void {
    this.cargar();
  }

  porId(_indice: number, usuario: UsuarioSistema): string {
    return usuario.id;
  }

  cambiarFiltro(filtro: FiltroRol): void {
    this.filtro.set(filtro);
    this.paginaActual.set(1);
  }

  cambiarBusqueda(busqueda: string): void {
    this.busqueda.set(busqueda);
    this.paginaActual.set(1);
  }

  irPagina(pagina: number): void {
    this.paginaActual.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }

  esCuentaPropia(usuario: UsuarioSistema): boolean {
    return usuario.id === this.usuario()?.id;
  }

  estaGuardando(usuario: UsuarioSistema): boolean {
    return this.guardando().has(usuario.id);
  }

  cargar(): void {
    this.cargando.set(true);
    this.usuarioService.listar().subscribe({
      next: usuarios => {
        this.usuarios.set(usuarios);
        this.paginaActual.set(1);
        this.error.set('');
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No fue posible consultar los usuarios.'));
        this.cargando.set(false);
      }
    });
  }

  /** `selector` se recibe para devolverlo al rol anterior si se cancela o falla. */
  cambiarRol(usuario: UsuarioSistema, selector: { value: string }): void {
    const rol = selector.value as Rol;
    const deshacer = () => { selector.value = usuario.rol; };
    if (rol === usuario.rol) return;
    if (!this.roles.includes(rol)) return deshacer();
    if (rol === 'propietario' && !confirm(
      `${usuario.correo ?? 'Esta cuenta'} tendrá acceso completo, incluida la gestión de usuarios. ¿Continuar?`
    )) {
      return deshacer();
    }
    this.guardar(usuario, { rol }, `${usuario.correo ?? 'La cuenta'} ahora es ${NOMBRE_ROL[rol]}.`, deshacer);
  }

  alternarActivo(usuario: UsuarioSistema): void {
    const activo = !usuario.activo;
    if (!activo && !confirm(`${usuario.correo ?? 'Esta cuenta'} no podrá iniciar sesión. ¿Desactivarla?`)) return;
    this.guardar(usuario, { activo }, `${usuario.correo ?? 'La cuenta'} quedó ${activo ? 'activa' : 'desactivada'}.`);
  }

  async cerrarSesion(): Promise<void> {
    if (this.cerrandoSesion()) return;
    this.cerrandoSesion.set(true);
    try {
      await this.authService.cerrarSesion();
      await this.router.navigate(['/login']);
    } catch {
      this.error.set('No fue posible cerrar la sesión. Intenta de nuevo.');
    } finally {
      this.cerrandoSesion.set(false);
    }
  }

  private guardar(usuario: UsuarioSistema, cambios: CambioUsuario, exito: string, alFallar?: () => void): void {
    if (this.estaGuardando(usuario)) return;
    this.error.set('');
    this.mensaje.set('');
    this.marcarGuardando(usuario.id, true);

    this.usuarioService.actualizar(usuario.id, cambios).subscribe({
      next: actualizado => {
        this.reemplazar(actualizado);
        this.mensaje.set(exito);
        this.marcarGuardando(usuario.id, false);
      },
      error: error => {
        alFallar?.();
        this.error.set(mensajeError(error, 'No fue posible guardar el cambio.'));
        this.marcarGuardando(usuario.id, false);
      }
    });
  }

  private reemplazar(actualizado: UsuarioSistema): void {
    this.usuarios.update(lista => lista.map(u => (u.id === actualizado.id ? actualizado : u)));
    this.paginaActual.set(1);
  }

  private marcarGuardando(id: string, activo: boolean): void {
    this.guardando.update(actual => {
      const siguiente = new Set(actual);
      if (activo) siguiente.add(id); else siguiente.delete(id);
      return siguiente;
    });
  }
}

export function coincideFiltro(usuario: UsuarioSistema, filtro: FiltroRol): boolean {
  if (filtro === 'todos') return true;
  if (filtro === 'inactivos') return !usuario.activo;
  return usuario.rol === filtro;
}

const ORDEN_ROL: Record<Rol, number> = { propietario: 0, empleado: 1, cliente: 2 };

function compararUsuarios(a: UsuarioSistema, b: UsuarioSistema): number {
  return ORDEN_ROL[a.rol] - ORDEN_ROL[b.rol] || (a.correo ?? '').localeCompare(b.correo ?? '', 'es');
}

export function normalizar(texto: string | null | undefined): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function mensajeError(error: any, porDefecto: string): string {
  if (error instanceof TimeoutError) return 'El servidor tardó demasiado en responder. Intenta de nuevo.';
  if (error?.status === 0) return 'No se pudo conectar con el servidor.';
  return error?.error?.mensaje || porDefecto;
}
