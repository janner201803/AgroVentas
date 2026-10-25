import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, of, shareReplay, tap, timeout } from 'rxjs';

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
  und: 'kg' | 'und';
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
  private readonly vigenciaProductosMs = 30_000;
  private readonly vigenciaHorariosMs = 10_000;
  private productosCache: { productos: ProductoPedido[]; vence: number } | null = null;
  private solicitudProductos: Observable<ProductoPedido[]> | null = null;
  private horariosCache = new Map<string, { horarios: HorarioEntrega[]; vence: number }>();
  private solicitudesHorarios = new Map<string, Observable<HorarioEntrega[]>>();

  obtenerProductos(): Observable<ProductoPedido[]> {
    if (this.productosCache && this.productosCache.vence > Date.now()) {
      return of(this.productosCache.productos);
    }
    if (this.solicitudProductos) return this.solicitudProductos;

    this.solicitudProductos = this.http.get<ProductoPedido[]>(this.inventarioUrl).pipe(
      timeout({ first: 25_000 }),
      tap(productos => {
        this.productosCache = { productos, vence: Date.now() + this.vigenciaProductosMs };
      }),
      finalize(() => { this.solicitudProductos = null; }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    return this.solicitudProductos;
  }

  obtenerHorarios(fecha: string): Observable<HorarioEntrega[]> {
    const cache = this.horariosCache.get(fecha);
    if (cache && cache.vence > Date.now()) return of(cache.horarios);
    const solicitudExistente = this.solicitudesHorarios.get(fecha);
    if (solicitudExistente) return solicitudExistente;

    const solicitud = this.http.get<HorarioEntrega[]>(`${this.apiUrl}/horarios`, { params: { fecha } }).pipe(
      timeout({ first: 15_000 }),
      tap(horarios => {
        this.horariosCache.set(fecha, { horarios, vence: Date.now() + this.vigenciaHorariosMs });
      }),
      finalize(() => { this.solicitudesHorarios.delete(fecha); }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.solicitudesHorarios.set(fecha, solicitud);
    return solicitud;
  }

  crearPedido(pedido: NuevoPedido): Observable<any> {
    return this.http.post(this.apiUrl, pedido).pipe(
      timeout({ first: 25_000 }),
      tap(() => { this.horariosCache.delete(pedido.fecha_entrega); })
    );
  }

  listarPedidos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
