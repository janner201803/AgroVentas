import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NuevoPedido {
  id_producto: number;
  cantidad: number;
  metodo_pago: 'efectivo' | 'consignacion';
  comprobante_url?: string;
  fecha_entrega: string;
  hora_entrega: string;
}

export interface ProductoPedido {
  id: number;
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface HorarioEntrega {
  hora: string;
  ocupado: boolean;
  disponible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:3001/api/pedidos';
  private inventarioUrl = 'http://localhost:3001/api/inventario?disponibles=true';

  obtenerProductos(): Observable<ProductoPedido[]> {
    return this.http.get<ProductoPedido[]>(this.inventarioUrl);
  }

  obtenerHorarios(fecha: string): Observable<HorarioEntrega[]> {
    return this.http.get<HorarioEntrega[]>(`${this.apiUrl}/horarios`, { params: { fecha } });
  }

  crearPedido(pedido: NuevoPedido): Observable<any> {
    return this.http.post(this.apiUrl, pedido);
  }

  listarPedidos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
