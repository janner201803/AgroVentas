import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProductoPedido } from './pedido.service';

export interface NuevoProducto {
  nombre: string;
  cantidad: number;
  precio: number;
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3001/api/inventario';

  listar(): Observable<ProductoPedido[]> {
    return this.http.get<ProductoPedido[]>(this.apiUrl);
  }

  crear(producto: NuevoProducto): Observable<{ mensaje: string; producto: ProductoPedido }> {
    return this.http.post<{ mensaje: string; producto: ProductoPedido }>(this.apiUrl, producto);
  }

}
