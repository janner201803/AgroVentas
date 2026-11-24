import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';

export interface AbonoCliente {
  id: number;
  valor: number;
  metodo_pago: 'efectivo' | 'transferencia';
  nota: string | null;
  registrado_en: string;
}

export interface CuentaCliente {
  id: number;
  valor_original: number;
  saldo_pendiente: number;
  estado: 'pendiente' | 'parcial' | 'pagada';
  fecha_emision: string;
  fecha_vencimiento: string | null;
  dias_mora: number | null;
}

export interface CompraCliente {
  id: number;
  pedido_id: string;
  total: number;
  metodo_pago: 'efectivo' | 'transferencia' | 'credito';
  creado_en: string;
  fecha_entrega: string | null;
  hora_entrega: string | null;
  estado_pedido: string;
  lineas: { id_producto: number; nombre?: string; cantidad: number; unidad?: string; subtotal: number }[];
  cuenta: CuentaCliente | null;
  abonos: AbonoCliente[];
}

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3001/api/cartera/mis-compras';

  listarPropias(): Observable<CompraCliente[]> {
    return this.http.get<CompraCliente[]>(this.apiUrl).pipe(timeout({ first: 20_000 }));
  }
}
