import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, map, of, shareReplay, tap, timeout } from 'rxjs';
import { EstadoPedido } from '../estados-pedido';

export interface NuevoPedido {
  lineas: { id_producto: number; cantidad: number }[];
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

export interface PedidoHistorial {
  lineas?: { id_producto: number; nombre: string; unidad: string; cantidad: number; precio: number; subtotal: number }[];
  id: string;
  id_producto: number;
  producto_nombre: string | null;
  producto_unidad: string | null;
  cantidad: number;
  valor: number;
  estado: string;
  metodo_pago: string;
  fecha_entrega: string;
  hora_entrega: string;
}

/** HU-13: pedido visto por el personal, con cliente, producto y último cambio. */
export interface PedidoGestion extends PedidoHistorial {
  credito_habilitado?: boolean;
  id_usuario: string | null;
  cliente_nombre: string | null;
  cliente_correo: string | null;
  cliente_celular: string | null;
  ultimo_cambio_en: string | null;
  ultimo_cambio_por: string | null;
}

/** HU-12: un cambio de estado registrado. */
export interface CambioEstadoPedido {
  id: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  nota: string | null;
  creado_en: string;
  responsable: string | null;
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

  invalidarProductos(): void {
    this.productosCache = null;
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
      tap(() => {
        this.horariosCache.delete(pedido.fecha_entrega);
        this.productosCache = null;
      })
    );
  }

  listarPedidos(): Observable<PedidoHistorial[]> {
    return this.http.get<PedidoHistorial[]>(this.apiUrl);
  }

  /** HU-13: todos los pedidos para el personal (opcionalmente por fecha de entrega). */
  listarGestion(rango: { desde?: string; hasta?: string } = {}): Observable<PedidoGestion[]> {
    const params: Record<string, string> = {};
    if (rango.desde) params['desde'] = rango.desde;
    if (rango.hasta) params['hasta'] = rango.hasta;
    return this.http.get<PedidoGestion[]>(`${this.apiUrl}/gestion`, { params }).pipe(timeout({ first: 20_000 }));
  }

  /** HU-12: cambia el estado; la base registra fecha y responsable. */
  cambiarEstado(id: string, estado: EstadoPedido, nota?: string, pago?: string): Observable<PedidoHistorial> {
    return this.http
      .patch<{ mensaje: string; pedido: PedidoHistorial }>(
        `${this.apiUrl}/${encodeURIComponent(id)}/estado`,
        { estado, nota, pago }
      )
      .pipe(
        timeout({ first: 20_000 }),
        tap(() => { this.productosCache = null; }),
        map(respuesta => respuesta.pedido)
      );
  }

  historialEstados(id: string): Observable<CambioEstadoPedido[]> {
    return this.http
      .get<CambioEstadoPedido[]>(`${this.apiUrl}/${encodeURIComponent(id)}/historial`)
      .pipe(timeout({ first: 15_000 }));
  }
}
