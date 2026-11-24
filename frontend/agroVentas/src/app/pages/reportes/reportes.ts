import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReporteResumen, ReportesService } from '../../core/services/reportes.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css'
})
export class Reportes implements OnInit {
  private reportesService = inject(ReportesService);
  readonly hoy = this.fechaLocal(new Date());
  desde = `${this.hoy.slice(0, 7)}-01`;
  hasta = this.hoy;
  reporte = signal<ReporteResumen | null>(null);
  cargando = signal(false);
  error = signal('');

  ngOnInit(): void { this.consultar(); }

  consultar(): void {
    this.error.set('');
    if (!this.desde || !this.hasta || this.desde > this.hasta) {
      this.error.set('Selecciona un rango válido: la fecha inicial debe ser igual o anterior a la final.');
      return;
    }
    if (this.hasta > this.hoy) {
      this.error.set('La fecha final no puede estar en el futuro.');
      return;
    }
    this.cargando.set(true);
    this.reportesService.resumen(this.desde, this.hasta).subscribe({
      next: reporte => this.reporte.set(reporte),
      error: error => this.error.set(error?.error?.mensaje || 'No fue posible consultar los reportes.'),
      complete: () => this.cargando.set(false)
    }).add(() => this.cargando.set(false));
  }

  exportarCsv(): void {
    const reporte = this.reporte();
    if (!reporte) return;
    const filas: (string | number)[][] = [
      ['Reporte AgroVentas', `${reporte.desde} a ${reporte.hasta}`],
      [],
      ['Resumen de ventas'],
      ['Cantidad de ventas', reporte.ventas.cantidad],
      ['Total vendido', reporte.ventas.total],
      ['Promedio por venta', reporte.ventas.promedio],
      [],
      ['Ventas por método de pago'],
      ['Método', 'Ventas', 'Total'],
      ...reporte.por_metodo_pago.map(item => [this.metodo(item.metodo_pago), item.cantidad, item.total]),
      [],
      ['Productos más vendidos'],
      ['Producto', 'Cantidad', 'Unidad', 'Total vendido'],
      ...reporte.productos_mas_vendidos.map(item => [item.nombre, item.cantidad, item.unidad, item.total]),
      [],
      ['Ventas por cliente'],
      ['Cliente', 'Ventas', 'Total'],
      ...reporte.ventas_por_cliente.map(item => [item.nombre, item.ventas, item.total])
    ];
    const csv = '\uFEFF' + filas.map(fila => fila.map(valor => this.csvCelda(valor)).join(';')).join('\r\n');
    const archivo = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `agroventas-reporte-${reporte.desde}-${reporte.hasta}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  imprimir(): void { window.print(); }

  metodo(metodo: string): string {
    if (metodo === 'credito') return 'Crédito';
    if (metodo === 'transferencia') return 'Transferencia';
    return 'Efectivo';
  }

  private csvCelda(valor: string | number): string {
    return `"${String(valor).replace(/"/g, '""')}"`;
  }

  private fechaLocal(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }
}
