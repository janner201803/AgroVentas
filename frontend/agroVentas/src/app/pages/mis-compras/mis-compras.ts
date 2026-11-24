import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Paginador } from '../../core/paginador';
import { finalize, timeout } from 'rxjs';
import { CompraCliente, ComprasService } from '../../core/services/compras.service';

interface OpcionSemana { valor: string; etiqueta: string }
interface OpcionProducto { valor: string; etiqueta: string }

@Component({
  selector: 'app-mis-compras',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, Paginador],
  templateUrl: './mis-compras.html',
  styleUrl: './mis-compras.css'
})
export class MisCompras implements OnInit {
  private comprasService = inject(ComprasService);
  compras = signal<CompraCliente[]>([]);
  cargando = signal(false);
  error = signal('');
  semanaOffset: number | null = null;
  productoFiltro = 'todos';

  get valorSemana(): string {
    return this.semanaOffset === null ? 'todas' : String(this.semanaOffset);
  }

  get opcionesSemana(): OpcionSemana[] {
    const nombres: Record<number, string> = { [-1]: 'Semana pasada', 0: 'Esta semana', 1: 'Próxima semana' };
    const opciones: OpcionSemana[] = [{ valor: 'todas', etiqueta: 'Todas las semanas' }];
    for (const offset of [-4, -3, -2, -1, 0, 1, 2]) {
      const rango = this.rangoSemana(offset);
      opciones.push({
        valor: String(offset),
        etiqueta: nombres[offset] ? `${nombres[offset]} · ${rango}` : rango
      });
    }
    return opciones;
  }

  get opcionesProducto(): OpcionProducto[] {
    const productos = new Map<number, string>();
    for (const compra of this.compras()) {
      for (const linea of compra.lineas) {
        productos.set(linea.id_producto, linea.nombre || `Producto #${linea.id_producto}`);
      }
    }
    return [
      { valor: 'todos', etiqueta: 'Todos los productos' },
      ...[...productos.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'es'))
        .map(([id, nombre]) => ({ valor: String(id), etiqueta: nombre }))
    ];
  }

  get comprasFiltradas(): CompraCliente[] {
    return this.compras().filter(compra => {
      const coincideSemana = this.semanaOffset === null || this.compraEnSemana(compra.creado_en, this.semanaOffset);
      const coincideProducto = this.productoFiltro === 'todos'
        || compra.lineas.some(linea => String(linea.id_producto) === this.productoFiltro);
      return coincideSemana && coincideProducto;
    });
  }

  get totalCompras(): number {
    return this.compras().reduce((total, compra) => total + Number(compra.total), 0);
  }

  get saldoPendiente(): number {
    return this.compras().reduce((total, compra) => total + Number(compra.cuenta?.saldo_pendiente ?? 0), 0);
  }

  get totalPagado(): number {
    return this.totalCompras - this.saldoPendiente;
  }

  seleccionarSemana(valor: string): void {
    this.semanaOffset = valor === 'todas' ? null : Number(valor);
  }

  seleccionarProducto(valor: string): void {
    this.productoFiltro = valor;
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

  private lunesDeSemana(offset: number): Date {
    const lunes = new Date();
    lunes.setHours(0, 0, 0, 0);
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7) + offset * 7);
    return lunes;
  }

  private rangoSemana(offset: number): string {
    const formato = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
    const lunes = this.lunesDeSemana(offset);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return `${formato.format(lunes)} – ${formato.format(domingo)}`;
  }

  private compraEnSemana(fecha: string, offset: number): boolean {
    const compra = new Date(fecha);
    if (Number.isNaN(compra.getTime())) return false;
    const inicio = this.lunesDeSemana(offset);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 7);
    return compra >= inicio && compra < fin;
  }
}
