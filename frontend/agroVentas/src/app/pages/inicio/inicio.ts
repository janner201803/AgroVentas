import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PedidoService, ProductoPedido } from '../../core/services/pedido.service';
import { Encabezado } from '../../shared/encabezado/encabezado';

/** Lista de precios: una fila por variedad con unidad, precio y disponibilidad (DESIGN.md). */
@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, Encabezado],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio implements OnInit {
  private pedidoService = inject(PedidoService);
  private destroyRef = inject(DestroyRef);

  variedades = signal<ProductoPedido[]>([]);
  cargando = signal(true);
  error = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.pedidoService.obtenerProductos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: productos => {
        this.variedades.set(productos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la lista de precios. Revisa tu conexión y vuelve a intentar.');
        this.cargando.set(false);
      }
    });
  }

  disponible(variedad: ProductoPedido): boolean {
    return Number(variedad.cantidad) > 0;
  }

  unidad(variedad: ProductoPedido): string {
    return variedad.und === 'kg' ? 'por kg' : 'por unidad';
  }

  /** Marcador de la foto mientras no haya fotos reales: "Piña pepa" → "PP". */
  iniciales(nombre: string): string {
    return nombre.trim().split(/\s+/).slice(0, 2).map(palabra => palabra.charAt(0).toUpperCase()).join('');
  }
}
