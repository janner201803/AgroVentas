import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Producto {
  id: number;
  nombre: string;
  cantidad: number;
  precio: number;
  unidad: 'kg' | 'unidad';
  peso_kg: number;
  activo: boolean;
}

export interface NuevoPedido {
  id_producto: number;
  cantidad: number;
  metodo_pago: 'efectivo' | 'consignacion';
  comprobante_url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:3001/api/pedidos';
  private inventarioUrl = 'http://localhost:3001/api/inventario';

  obtenerProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.inventarioUrl);
  }

  crearPedido(pedido: NuevoPedido): Observable<any> {
    return this.http.post(this.apiUrl, pedido);
  }

  listarPedidos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
