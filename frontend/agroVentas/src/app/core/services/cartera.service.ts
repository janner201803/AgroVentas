import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';

export interface AbonoCartera {
  id: number;
  cuenta_id: number;
  valor: number;
  metodo_pago: 'efectivo' | 'transferencia';
  nota: string | null;
  registrado_por_nombre: string | null;
  registrado_en: string;
}

export interface CuentaCartera {
  id: number;
  venta_id: number;
  cliente_id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  pedido_id: string;
  lineas: { id_producto: number; nombre?: string; cantidad: number; unidad?: string; subtotal: number }[];
  valor_original: number;
  saldo_pendiente: number;
  estado: 'pendiente' | 'parcial' | 'pagada';
  fecha_emision: string;
  fecha_vencimiento: string | null;
  dias_mora: number | null;
  abonos: AbonoCartera[];
}

export interface NuevoAbono {
  valor: number;
  metodo_pago: 'efectivo' | 'transferencia';
  nota: string | null;
}

@Injectable({ providedIn: 'root' })
export class CarteraService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3001/api/cartera';

  listar(estado = ''): Observable<CuentaCartera[]> {
    const params: Record<string, string> = {};
    if (estado) params['estado'] = estado;
    return this.http.get<CuentaCartera[]>(this.apiUrl, { params }).pipe(timeout({ first: 20_000 }));
  }

  registrarAbono(cuentaId: number, abono: NuevoAbono): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/${cuentaId}/abonos`, abono).pipe(timeout({ first: 20_000 }));
  }
}
