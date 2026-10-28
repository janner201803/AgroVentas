import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private recargaProgramada: ReturnType<typeof setTimeout> | null = null;
  private consultaEnCurso = false;
  private recargaPendiente = false;
  private destruido = false;

  private readonly intervaloActualizacionMs = 30_000;
  private readonly esperaReintentoMs = 5_000;

  productos: ProductoPedido[] = [];
  esAdministrador = false;
  cargando = true;
  guardando = false;
  mensaje = '';
  error = '';
  producto: NuevoProducto = this.nuevoProducto();

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
        this.cdr.markForCheck
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
}
