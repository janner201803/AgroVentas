import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, finalize, of, shareReplay, tap, timeout } from 'rxjs';
import { PedidoService } from './pedido.service';

export interface ProductoCatalogo {
  id: number;
  nombre: string;
  unidad: string;
  precio: number;
}

export interface ProductoInventario {
  id: number;
  id_producto: number;
  nombre: string;
  cantidad: number;
  precio: number;
  und: 'kg' | 'und';
  /** HU-18: reservado en pedidos activos. null si la migración aún no está aplicada. */
  comprometido?: number | null;
  /** HU-18: disponible + comprometido. */
  total?: number | null;
  /** HU-18: fecha ISO del último cambio de cantidad. null = sin registro. */
  actualizado_en?: string | null;
}

export interface ResumenInventario {
  /** true si el backend no encontró la función SQL de HU-18 y respondió con el listado básico. */
  migracionPendiente: boolean;
  productos: ProductoInventario[];
}

export interface AgregarExistencias {
  id_producto: number;
  cantidad: number;
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private http = inject(HttpClient);
  private pedidoService = inject(PedidoService);
  private readonly inventarioUrl = 'http://localhost:3001/api/inventario';
  private readonly productosUrl = 'http://localhost:3001/api/productos';
  private readonly cacheMs = 20_000;
  private inventarioCache: ResumenInventario | null = null;
  private inventarioCacheCreado = 0;
  private solicitudInventario: Observable<ResumenInventario> | null = null;
  private catalogoCache: ProductoCatalogo[] | null = null;
  private catalogoCacheCreado = 0;
  private solicitudCatalogo: Observable<ProductoCatalogo[]> | null = null;

  /** Resumen administrativo del inventario (GET /api/inventario/resumen, solo administrador). */
  listar(forzar = false): Observable<ResumenInventario> {
    if (!forzar && this.inventarioCache && Date.now() - this.inventarioCacheCreado < this.cacheMs) {
      return of(this.inventarioCache);
    }
    if (this.solicitudInventario) return this.solicitudInventario;
    this.solicitudInventario = this.http.get<ResumenInventario>(`${this.inventarioUrl}/resumen`).pipe(
      timeout({ first: 15_000 }),
      tap(resumen => {
        this.inventarioCache = resumen;
        this.inventarioCacheCreado = Date.now();
      }),
      finalize(() => { this.solicitudInventario = null; }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    return this.solicitudInventario;
  }

  invalidarInventario(): void {
    this.inventarioCache = null;
    this.inventarioCacheCreado = 0;
  }

  listarCatalogo(): Observable<ProductoCatalogo[]> {
    if (this.catalogoCache && Date.now() - this.catalogoCacheCreado < 30_000) return of(this.catalogoCache);
    if (this.solicitudCatalogo) return this.solicitudCatalogo;
    this.solicitudCatalogo = this.http.get<ProductoCatalogo[]>(this.productosUrl).pipe(
      timeout({ first: 15_000 }),
      tap(productos => {
        this.catalogoCache = productos;
        this.catalogoCacheCreado = Date.now();
      }),
      finalize(() => { this.solicitudCatalogo = null; }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    return this.solicitudCatalogo;
  }

  agregarExistencias(datos: AgregarExistencias): Observable<{ mensaje: string; producto: ProductoInventario }> {
    return this.http.post<{ mensaje: string; producto: ProductoInventario }>(this.inventarioUrl, datos).pipe(
      timeout({ first: 20_000 }),
      tap(({ producto }) => {
        this.pedidoService.invalidarProductos();
        if (this.inventarioCache) {
          const anterior = this.inventarioCache.productos.find(item => item.id_producto === producto.id_producto);
          this.inventarioCache = {
            ...this.inventarioCache,
            productos: [
              ...this.inventarioCache.productos.filter(item => item.id_producto !== producto.id_producto),
              combinarFila(anterior, producto)
            ].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
          };
          this.inventarioCacheCreado = Date.now();
        }
      })
    );
  }
}

/**
 * Une la fila que devuelve agregar_existencias (sin comprometido ni fecha) con la
 * que ya se mostraba, para no perder esos datos mientras llega la recarga.
 */
export function combinarFila(anterior: ProductoInventario | undefined, nueva: ProductoInventario): ProductoInventario {
  const comprometido = nueva.comprometido ?? anterior?.comprometido ?? null;
  return {
    ...anterior,
    ...nueva,
    comprometido,
    total: comprometido == null ? null : nueva.cantidad + comprometido,
    actualizado_en: nueva.actualizado_en ?? anterior?.actualizado_en ?? null
  };
}
