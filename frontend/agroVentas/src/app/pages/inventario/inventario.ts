import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
export class Inventario implements OnInit {
  private inventarioService = inject(InventarioService);
  private authService = inject(AuthService);

  productos: ProductoPedido[] = [];
  esAdministrador = false;
  cargando = true;
  guardando = false;
  mensaje = '';
  error = '';
  presentacionVisual: 'kg' | 'unidad' = 'kg';

  producto: NuevoProducto = this.nuevoProducto();

  ngOnInit(): void {
    // adminGuard ya validó la sesión en Supabase y el correo permitido.
    this.esAdministrador = this.authService.esAdministrador();
    this.cargarInventario();
  }

  private nuevoProducto(): NuevoProducto {
    return { nombre: '', cantidad: 1, precio: 0 };
  }

  cargarInventario(): void {
    this.cargando = true;
    this.inventarioService.listar().subscribe({
      next: productos => { this.productos = productos; this.cargando = false; },
      error: err => {
        this.error = err.error?.mensaje || 'No se pudo cargar el inventario.';
        this.cargando = false;
      }
    });
  }

  agregarProducto(): void {
    this.error = '';
    this.mensaje = '';
    if (!this.esAdministrador) {
      this.error = 'Solo un administrador puede agregar productos.';
      return;
    }
    if (!this.producto.nombre.trim() || !Number.isFinite(this.producto.cantidad) || this.producto.cantidad <= 0 || this.producto.precio <= 0) {
      this.error = 'Completa el nombre, una cantidad mayor que cero y el precio unitario.';
      return;
    }

    this.guardando = true;
    this.inventarioService.crear({ ...this.producto, nombre: this.producto.nombre.trim() }).subscribe({
      next: ({ producto }) => {
        this.productos = [...this.productos, producto].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        this.producto = this.nuevoProducto();
        this.presentacionVisual = 'kg';
        this.mensaje = 'Producto agregado al inventario.';
        this.guardando = false;
      },
      error: err => {
        this.error = err.error?.mensaje || 'No fue posible guardar el producto.';
        this.guardando = false;
      }
    });
  }
}
