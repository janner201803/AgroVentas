import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { EncabezadoSeccion } from '../../core/encabezado-seccion';
import { CompraCliente, ComprasService } from '../../core/services/compras.service';

@Component({
  selector: 'app-mis-compras',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, RouterLink, EncabezadoSeccion],
  templateUrl: './mis-compras.html',
  styleUrl: './mis-compras.css'
})
export class MisCompras implements OnInit {
  private comprasService = inject(ComprasService);
  compras = signal<CompraCliente[]>([]);
  cargando = signal(false);
  error = signal('');

  get totalCompras(): number {
    return this.compras().reduce((total, compra) => total + Number(compra.total), 0);
  }

  get saldoPendiente(): number {
    return this.compras().reduce((total, compra) => total + Number(compra.cuenta?.saldo_pendiente ?? 0), 0);
  }

  get totalPagado(): number {
    return this.totalCompras - this.saldoPendiente;
  }

  ngOnInit(): void { this.consultar(); }

  consultar(): void {
    this.error.set('');
    this.cargando.set(true);
    this.comprasService.listarPropias().pipe(
      timeout({ first: 20_000 }),
      finalize(() => this.cargando.set(false))
    ).subscribe({
      next: compras => this.compras.set(compras ?? []),
      error: error => this.error.set(error?.error?.mensaje || 'No fue posible consultar tus compras y pagos.')
    });
  }

  metodoPago(metodo: string): string {
    if (metodo === 'credito') return 'Crédito';
    if (metodo === 'transferencia' || metodo === 'consignacion') return 'Transferencia';
    return 'Efectivo';
  }

  estadoCuenta(estado: string): string {
    if (estado === 'pagada') return 'Pagada';
    if (estado === 'parcial') return 'Abono parcial';
    return 'Pendiente';
  }

  etiquetaPedido(estado: string): string {
    const etiquetas: Record<string, string> = {
      pendiente: 'Pendiente', en_preparacion: 'En preparación', entregado: 'Entregado', cancelado: 'Cancelado'
    };
    return etiquetas[estado] || estado || 'Sin estado';
  }
}
