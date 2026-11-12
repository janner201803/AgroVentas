import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AgregarExistencias,
  InventarioService,
  combinarFila,
  ProductoCatalogo,
  ProductoInventario
} from '../../core/services/inventario.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css'
})
export class Inventario implements OnInit, OnDestroy {
  private inventarioService = inject(InventarioService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private recargaProgramada: ReturnType<typeof setTimeout> | null = null;
  private reintentoCatalogo: ReturnType<typeof setTimeout> | null = null;
  private consultaInventarioEnCurso = false;
  private recargaInventarioPendiente = false;
  private destruido = false;

  usuario = this.authService.usuario;
  productos: ProductoInventario[] = [];
  catalogo: ProductoCatalogo[] = [];
  esAdministrador = false;
  cargando = true;
  cargandoCatalogo = true;
  guardando = false;
  cerrandoSesion = false;
  mensaje = '';
  error = '';
  idProductoSeleccionado: number | null = null;
  cantidadAgregar = 1;
  busqueda = '';
  migracionPendiente = false;

  ngOnInit(): void {
    this.esAdministrador = this.authService.esAdministrador();
    this.cargarCatalogo();
    this.cargarInventario();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.limpiarTemporizadores();
  }

  /** HU-18: existencias ordenadas por nombre y filtradas por el texto de búsqueda. */
  get productosFiltrados(): ProductoInventario[] {
    const termino = normalizarTexto(this.busqueda);
    return ordenarPorNombre(this.productos)
      .filter(producto => !termino || normalizarTexto(producto.nombre).includes(termino));
  }

  limpiarBusqueda(): void {
    this.busqueda = '';
  }

  porIdProducto(_indice: number, producto: ProductoInventario): number {
    return producto.id_producto;
  }

  get productoSeleccionado(): ProductoCatalogo | undefined {
    return this.catalogo.find(producto => producto.id === Number(this.idProductoSeleccionado));
  }

  get unidadSeleccionada(): 'kg' | 'und' | null {
    const unidad = String(this.productoSeleccionado?.unidad || '').trim().toLocaleLowerCase('es-CO');
    if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(unidad)) return 'kg';
    if (['und', 'unidad', 'unidades'].includes(unidad)) return 'und';
    return null;
  }

  get existenciasSeleccionadas(): number {
    return this.productos.find(producto => producto.id_producto === this.idProductoSeleccionado)?.cantidad ?? 0;
  }

  cambiarProducto(id: number | null): void {
    this.idProductoSeleccionado = id;
    this.cantidadAgregar = 1;
    this.error = '';
  }

  async cerrarSesion(): Promise<void> {
    if (this.cerrandoSesion) return;
    this.cerrandoSesion = true;
    this.error = '';
    try {
      await this.authService.cerrarSesion();
      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      this.error = 'No fue posible cerrar la sesión. Intenta de nuevo.';
    } finally {
      this.cerrandoSesion = false;
    }
  }

  private cargarCatalogo(): void {
    if (this.destruido) return;
    if (this.reintentoCatalogo) clearTimeout(this.reintentoCatalogo);
    this.reintentoCatalogo = null;
    this.cargandoCatalogo = true;
    this.inventarioService.listarCatalogo().pipe(
      timeout({ first: 18_000 }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.cargandoCatalogo = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: catalogo => {
        this.catalogo = catalogo;
        if (this.idProductoSeleccionado != null && !catalogo.some(item => item.id === this.idProductoSeleccionado)) {
          this.cambiarProducto(null);
        }
        this.cdr.markForCheck();
      },
      error: error => {
        this.error = error instanceof TimeoutError
          ? 'El catálogo de productos tardó demasiado en cargar.'
          : error.error?.mensaje || 'No fue posible cargar el catálogo de productos.';
        this.reintentoCatalogo = setTimeout(() => this.cargarCatalogo(), 5_000);
        this.cdr.markForCheck();
      }
    });
  }

  cargarInventario(forzar = false): void {
    if (this.destruido) return;
    if (this.consultaInventarioEnCurso) {
      if (forzar) this.recargaInventarioPendiente = true;
      return;
    }
    if (this.recargaProgramada) clearTimeout(this.recargaProgramada);
    this.recargaProgramada = null;
    this.consultaInventarioEnCurso = true;
    if (this.productos.length === 0) this.cargando = true;
    this.inventarioService.listar(forzar).pipe(
      timeout({ first: 18_000 }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.consultaInventarioEnCurso = false;
        this.cargando = false;
        this.cdr.markForCheck();
        if (this.recargaInventarioPendiente && !this.destruido) {
          this.recargaInventarioPendiente = false;
          queueMicrotask(() => this.cargarInventario(true));
        }
      })
    ).subscribe({
      next: resumen => {
        this.productos = ordenarPorNombre(resumen.productos);
        this.migracionPendiente = resumen.migracionPendiente;
        this.error = '';
        this.cdr.markForCheck();
        this.recargaProgramada = setTimeout(() => this.cargarInventario(true), 30_000);
      },
      error: error => {
        this.error = error instanceof TimeoutError
          ? 'La consulta del inventario tardó demasiado. Se volverá a intentar.'
          : error.error?.mensaje || 'No fue posible consultar el inventario.';
        this.cdr.markForCheck();
        this.recargaProgramada = setTimeout(() => this.cargarInventario(true), 5_000);
      }
    });
  }

  agregarExistencias(): void {
    this.error = '';
    this.mensaje = '';
    const producto = this.productoSeleccionado;
    const unidad = this.unidadSeleccionada;

    if (!this.esAdministrador) {
      this.error = 'Solo el administrador puede modificar el inventario.';
      return;
    }
    if (!producto || !unidad) {
      this.error = 'Selecciona un producto válido del catálogo.';
      return;
    }
    const cantidadValida = unidad === 'und'
      ? Number.isInteger(this.cantidadAgregar)
      : Math.abs(this.cantidadAgregar * 10 - Math.round(this.cantidadAgregar * 10)) < 1e-8;
    if (!Number.isFinite(this.cantidadAgregar) || this.cantidadAgregar <= 0 || !cantidadValida) {
      this.error = unidad === 'kg'
        ? 'La cantidad debe ser mayor que cero y usar incrementos de 0,1 kg.'
        : 'La cantidad debe ser un número entero de unidades mayor que cero.';
      return;
    }

    const datos: AgregarExistencias = {
      id_producto: producto.id,
      cantidad: this.cantidadAgregar
    };
    this.guardando = true;
    this.inventarioService.agregarExistencias(datos).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.guardando = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: respuesta => {
        const fila = respuesta.producto;
        const anterior = this.productos.find(item => item.id_producto === fila.id_producto);
        this.productos = ordenarPorNombre([
          ...this.productos.filter(item => item.id_producto !== fila.id_producto),
          combinarFila(anterior, fila)
        ]);
        this.cantidadAgregar = 1;
        this.mensaje = respuesta.mensaje;
        this.cdr.markForCheck();
        this.cargarInventario(true);
      },
      error: error => {
        this.error = error instanceof TimeoutError
          ? 'El guardado tardó demasiado. Actualiza el inventario antes de volver a enviarlo para evitar sumar dos veces.'
          : error.error?.mensaje || 'No fue posible agregar existencias.';
        this.cdr.markForCheck();
        this.cargarInventario(true);
      }
    });
  }

  private limpiarTemporizadores(): void {
    if (this.recargaProgramada) clearTimeout(this.recargaProgramada);
    if (this.reintentoCatalogo) clearTimeout(this.reintentoCatalogo);
    this.recargaProgramada = null;
    this.reintentoCatalogo = null;
  }
}

/** Minúsculas y sin tildes, para que "pina" encuentre "Piña". */
export function normalizarTexto(texto: string | null | undefined): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-CO');
}

export function ordenarPorNombre(productos: ProductoInventario[]): ProductoInventario[] {
  return [...productos].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' }));
}
