
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PedidoService } from '../../core/services/pedido.service';

interface Producto {
  id: number;
  nombre: string;
  unidad: 'kg' | 'unidad';
  precio: number;
  peso_kg: number;
  activo: boolean;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css'
})
export class Pedidos {
  private pedidoService = inject(PedidoService);

  productos: Producto[] = [
    { id: 1, nombre: 'Piña pepa', unidad: 'kg', precio: 5000, peso_kg: 1, activo: true },
    { id: 2, nombre: 'Piña primera', unidad: 'kg', precio: 4000, peso_kg: 1, activo: true },
    { id: 3, nombre: 'Piña segunda', unidad: 'kg', precio: 3000, peso_kg: 1, activo: true },
    { id: 4, nombre: 'Piña tercera', unidad: 'unidad', precio: 2500, peso_kg: 1, activo: true },
    { id: 5, nombre: 'Piña cuarta', unidad: 'unidad', precio: 2000, peso_kg: 0.8, activo: true },
    { id: 6, nombre: 'Piña quinta', unidad: 'unidad', precio: 1500, peso_kg: 0.6, activo: true },
    { id: 7, nombre: 'Piña delgada', unidad: 'unidad', precio: 1200, peso_kg: 0.4, activo: true },
    { id: 8, nombre: 'Piña huevo', unidad: 'unidad', precio: 500, peso_kg: 0.2, activo: true }
  ];

  productoId: number | null = null;
  cantidad: number | null = null;

  metodoPago: 'efectivo' | 'consignacion' = 'efectivo';
  comprobante: File | null = null;

  enviando = false;
  mensaje = '';
  error = '';

  get productoSeleccionado(): Producto | undefined {
    return this.productos.find(
      producto => producto.id === Number(this.productoId)
    );
  }

  get pesoTotalKg(): number {
    const producto = this.productoSeleccionado;

    if (!producto || this.cantidad == null || this.cantidad <= 0) {
      return 0;
    }

    return producto.unidad === 'kg'
      ? this.cantidad
      : this.cantidad * producto.peso_kg;
  }

  get valorEstimado(): number {
    const producto = this.productoSeleccionado;

    if (!producto || this.cantidad == null || this.cantidad <= 0) {
      return 0;
    }

    return producto.precio * this.cantidad;
  }

  seleccionarComprobante(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    this.error = '';
    this.comprobante = null;

    if (!archivo) {
      return;
    }

    const tiposPermitidos = [
      'application/pdf',
      'image/jpeg',
      'image/png'
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
      this.error = 'Adjunta un PDF, una imagen JPG o PNG.';
      input.value = '';
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      this.error = 'El comprobante no puede superar los 5 MB.';
      input.value = '';
      return;
    }

    this.comprobante = archivo;
  }

  enviarPedido(): void {
    this.error = '';
    this.mensaje = '';

    const producto = this.productoSeleccionado;

    if (!producto || this.cantidad == null || this.cantidad <= 0) {
      this.error = 'Selecciona un producto e indica una cantidad válida.';
      return;
    }

    if (this.pesoTotalKg > 2000) {
      this.error = 'El pedido no puede superar las 2 toneladas.';
      return;
    }

    if (this.metodoPago === 'consignacion') {
      this.error = 'La subida del comprobante a Storage todavía debe implementarse.';
      return;
    }

    this.enviando = true;

    this.pedidoService.crearPedido({
      id_producto: producto.id,
      cantidad: this.cantidad,
      metodo_pago: this.metodoPago
    }).subscribe({
      next: () => {
        this.mensaje = 'Tu pedido fue registrado correctamente.';
        this.productoId = null;
        this.cantidad = null;
        this.comprobante = null;
        this.enviando = false;
      },
      error: (err) => {
        console.error('Error al registrar el pedido:', err);
        this.error =
          err.error?.mensaje || 'No fue posible registrar el pedido.';
        this.enviando = false;
      }
    });
  }
}
