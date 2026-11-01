import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InventarioService, NuevoProducto } from '../../core/services/inventario.service';
import { ProductoPedido } from '../../core/services/pedido.service';
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
  private consultaEnCurso = false;
  private recargaPendiente = false;
  private destruido = false;

  private readonly intervaloActualizacionMs = 30_000;
  private readonly esperaReintentoMs = 5_000;

  usuario = this.authService.usuario;
  productos: ProductoPedido[] = [];
  esAdministrador = false;
  cargando = true;
  guardando = false;
  cerrandoSesion = false;
  mensaje = '';
  error = '';
  producto: NuevoProducto = this.nuevoProducto();
  productoEnEdicion: ProductoPedido | null = null;
  edicion: NuevoProducto = this.nuevoProducto();
  productoStockId: number | null = null;
  cantidadAgregar = 1;

  ngOnInit(): void {
    // adminGuard ya validó la sesión en Supabase y el correo permitido.
    this.esAdministrador = this.authService.esAdministrador();
    this.cargarInventario();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.limpiarRecargaProgramada();
  }

  private nuevoProducto(): NuevoProducto {
    return { nombre: '', cantidad: 1, precio: 0, und: 'kg' };
  }

  get productoStock(): ProductoPedido | undefined {
    return this.productos.find(item => item.id === this.productoStockId);
  }

  unidadSugerida(nombre: string): 'kg' | 'und' | null {
    const palabras = nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es-CO')
      .split(/\s+/);

    if (palabras.includes('pepa') || palabras.includes('primera') || palabras.includes('segunda')) {
      return 'kg';
    }
    if (['tercera', 'cuarta', 'quinta', 'delgada', 'huevo'].some(variedad => palabras.includes(variedad))) {
      return 'und';
    }
    return null;
  }

  actualizarUnidadProducto(nombre: string): void {
    const unidad = this.unidadSugerida(nombre);
    if (unidad) this.producto.und = unidad;
  }

  actualizarUnidadEdicion(nombre: string): void {
    const unidad = this.unidadSugerida(nombre);
    if (unidad) this.edicion.und = unidad;
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

  cargarInventario(forzar = false): void {
    if (this.destruido) return;
    if (this.consultaEnCurso) {
      if (forzar) this.recargaPendiente = true;
      return;
    }
    this.limpiarRecargaProgramada();
    this.consultaEnCurso = true;
    // En las actualizaciones en segundo plano se conserva el catálogo visible.
    if (this.productos.length === 0) this.cargando = true;
    this.cdr.markForCheck();
    this.inventarioService.listar(forzar).pipe(
      timeout({ first: 38_000 }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.consultaEnCurso = false;
        this.cargando = false;
        this.cdr.markForCheck();
        if (this.recargaPendiente && !this.destruido) {
          this.recargaPendiente = false;
          queueMicrotask(() => this.cargarInventario(true));
        }
      })
    ).subscribe({
      next: productos => {
        this.productos = productos;
        this.error = '';
        this.cdr.markForCheck();
        this.programarRecarga(this.intervaloActualizacionMs);
      },
      error: err => {
        const detalle = err instanceof TimeoutError
          ? 'La consulta tardó demasiado.'
          : err.error?.mensaje || 'No se pudo consultar el inventario.';
        this.error = this.productos.length > 0
          ? `${detalle} Se volverá a intentar automáticamente.`
          : `${detalle} Reintentando automáticamente…`;
          this.cdr.markForCheck();
        this.programarRecarga(this.esperaReintentoMs);
      }
    });
  }

  private programarRecarga(esperaMs: number): void {
    this.limpiarRecargaProgramada();
    if (this.destruido) return;
    this.recargaProgramada = setTimeout(() => {
      this.recargaProgramada = null;
      if (this.guardando) {
        this.programarRecarga(this.esperaReintentoMs);
        return;
      }
      this.cargarInventario(true);
    }, esperaMs);
  }

  private limpiarRecargaProgramada(): void {
    if (this.recargaProgramada) clearTimeout(this.recargaProgramada);
    this.recargaProgramada = null;
  }

  agregarProducto(): void {
    this.error = '';
    this.mensaje = '';
    if (!this.esAdministrador) {
      this.error = 'Solo un administrador puede agregar productos.';
      return;
    }
    const unidadSugerida = this.unidadSugerida(this.producto.nombre);
    if (unidadSugerida) this.producto.und = unidadSugerida;
    const cantidadValida = this.producto.und === 'und'
      ? Number.isInteger(this.producto.cantidad)
      : Math.abs(this.producto.cantidad * 10 - Math.round(this.producto.cantidad * 10)) < 1e-8;
    if (!this.producto.nombre.trim() || !cantidadValida || this.producto.cantidad <= 0 || this.producto.precio <= 0) {
      this.error = 'Completa el nombre, la cantidad válida para la unidad elegida y el precio.';
      return;
    }

    this.guardando = true;
    this.inventarioService.crear({ ...this.producto, nombre: this.producto.nombre.trim() })
      .pipe(finalize(() => { this.guardando = false; }))
      .subscribe({
      next: ({ producto }) => {
        this.productos = [...this.productos, producto].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        this.producto = this.nuevoProducto();
        this.mensaje = 'Producto agregado al inventario.';
        this.cargarInventario(true);
      },
      error: err => {
        if (err instanceof TimeoutError || err.status === 504) {
          this.error = err.error?.mensaje || 'El guardado excedió el tiempo de espera. Revisa el catálogo: si el producto no aparece, vuelve a intentarlo.';
          this.cargarInventario(true);
          return;
        }
        this.error = err.error?.mensaje || 'No fue posible guardar el producto.';
      }
    });
  }

  cambiarProductoStock(id: number | null): void {
    this.productoStockId = id;
    this.cantidadAgregar = 1;
  }

  agregarExistencias(): void {
    this.error = '';
    this.mensaje = '';
    const seleccionado = this.productoStock;
    if (!this.esAdministrador || !seleccionado) {
      this.error = 'Selecciona un producto existente.';
      return;
    }
    const cantidadValida = seleccionado.und === 'und'
      ? Number.isInteger(this.cantidadAgregar)
      : Math.abs(this.cantidadAgregar * 10 - Math.round(this.cantidadAgregar * 10)) < 1e-8;
    if (!Number.isFinite(this.cantidadAgregar) || this.cantidadAgregar <= 0 || !cantidadValida) {
      this.error = `Ingresa una cantidad válida para la unidad ${seleccionado.und}.`;
      return;
    }

    this.guardando = true;
    this.inventarioService.agregarExistencias(seleccionado.id, this.cantidadAgregar)
      .pipe(finalize(() => { this.guardando = false; }))
      .subscribe({
        next: ({ producto }) => {
          this.productos = this.productos.map(item => item.id === producto.id ? producto : item);
          this.cantidadAgregar = 1;
          this.mensaje = `Existencias actualizadas para ${producto.nombre}.`;
          this.cargarInventario(true);
        },
        error: err => {
          this.error = this.mensajeErrorInventario(err, 'No fue posible agregar las existencias.');
        }
      });
  }

  editarProducto(producto: ProductoPedido): void {
    this.error = '';
    this.mensaje = '';
    this.productoEnEdicion = producto;
    this.edicion = {
      nombre: producto.nombre,
      cantidad: producto.cantidad,
      precio: producto.precio,
      und: producto.und
    };
  }

  cancelarEdicion(): void {
    this.productoEnEdicion = null;
    this.edicion = this.nuevoProducto();
  }

  guardarEdicion(): void {
    this.error = '';
    this.mensaje = '';
    const productoActual = this.productoEnEdicion;
    if (!this.esAdministrador || !productoActual) {
      this.error = 'Selecciona un producto para editar.';
      return;
    }
    const unidadSugerida = this.unidadSugerida(this.edicion.nombre);
    if (unidadSugerida && this.edicion.und !== unidadSugerida) {
      this.error = `${this.edicion.nombre.trim()} se vende por ${unidadSugerida}; selecciona esa unidad antes de guardar.`;
      return;
    }

    const cantidadValida = this.edicion.und === 'und'
      ? Number.isInteger(this.edicion.cantidad)
      : Math.abs(this.edicion.cantidad * 10 - Math.round(this.edicion.cantidad * 10)) < 1e-8;
    if (
      !this.edicion.nombre.trim()
      || !Number.isFinite(this.edicion.cantidad)
      || this.edicion.cantidad < 0
      || !cantidadValida
      || !Number.isFinite(this.edicion.precio)
      || this.edicion.precio <= 0
    ) {
      this.error = 'Completa el nombre, una cantidad válida (puede ser cero) y un precio mayor que cero.';
      return;
    }

    this.guardando = true;
    this.inventarioService.actualizar(productoActual.id, {
      ...this.edicion,
      nombre: this.edicion.nombre.trim()
    }).pipe(finalize(() => { this.guardando = false; })).subscribe({
      next: ({ producto }) => {
        this.productos = [...this.productos.filter(item => item.id !== producto.id), producto]
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        this.cancelarEdicion();
        this.mensaje = 'Producto actualizado correctamente.';
        this.cargarInventario(true);
      },
      error: err => {
        this.error = err.error?.mensaje || 'No fue posible actualizar el producto.';
      }
    });
  }

  eliminarProducto(producto: ProductoPedido): void {
    this.error = '';
    this.mensaje = '';
    if (!this.esAdministrador) {
      this.error = 'Solo un administrador puede eliminar productos.';
      return;
    }
    if (!window.confirm(`¿Retirar "${producto.nombre}" del inventario? Dejará de aparecer en pedidos nuevos y se conservará en el historial.`)) return;

    this.guardando = true;
    this.inventarioService.eliminar(producto.id)
      .pipe(finalize(() => { this.guardando = false; }))
      .subscribe({
        next: () => {
          this.productos = this.productos.filter(item => item.id !== producto.id);
          if (this.productoStockId === producto.id) this.productoStockId = null;
          if (this.productoEnEdicion?.id === producto.id) this.cancelarEdicion();
          this.mensaje = 'Producto retirado del inventario; se conserva en el historial de pedidos.';
          this.cargarInventario(true);
        },
        error: err => {
          this.error = this.mensajeErrorInventario(err, 'No fue posible eliminar el producto.');
        }
      });
  }

  private mensajeErrorInventario(err: { status?: number; error?: { mensaje?: string } }, alternativo: string): string {
      if (err.status === 403) {
        return 'Supabase rechazó el cambio. Aplica la migración 20261101_inventario_edicion_eliminacion.sql y verifica que la sesión sea de administrador.';
      }
      if (err.status === 409) {
        return err.error?.mensaje || 'No se pudo eliminar: el producto tiene pedidos asociados.';
      }
      return err.error?.mensaje || alternativo;
  }
}
