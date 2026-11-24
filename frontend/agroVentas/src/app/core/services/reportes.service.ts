import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';

export interface ReporteResumen {
  desde: string;
  hasta: string;
  ventas: { cantidad: number; total: number; promedio: number };
  por_metodo_pago: { metodo_pago: string; cantidad: number; total: number }[];
  productos_mas_vendidos: { id_producto: string | null; nombre: string; unidad: string; cantidad: number; total: number }[];
  ventas_por_cliente: { cliente_id: number | null; nombre: string; ventas: number; total: number }[];
  cartera: { cuentas_abiertas: number; saldo_pendiente: number; cuentas_en_mora: number; saldo_en_mora: number };
  pedidos: { pendientes: number; en_preparacion: number; entregas_hoy: number };
  inventario: { productos_sin_existencias: number; productos: { id_producto: number; nombre: string; unidad: string; disponible: number }[] };
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3001/api/reportes';

  resumen(desde: string, hasta: string): Observable<ReporteResumen> {
    return this.http.get<ReporteResumen>(this.apiUrl, { params: { desde, hasta } }).pipe(timeout({ first: 25_000 }));
  }
}
