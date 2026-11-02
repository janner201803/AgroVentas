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
  private inventarioCache: ProductoInventario[] | null = null;
  private inventarioCacheCreado = 0;
  private solicitudInventario: Observable<ProductoInventario[]> | null = null;
  private catalogoCache: ProductoCatalogo[] | null = null;
  private catalogoCacheCreado = 0;
  private solicitudCatalogo: Observable<ProductoCatalogo[]> | null = null;

  listar(forzar = false): Observable<ProductoInventario[]> {
    if (!forzar && this.inventarioCache && Date.now() - this.inventarioCacheCreado < this.cacheMs) {
      return of(this.inventarioCache);
    }
    if (this.solicitudInventario) return this.solicitudInventario;
    this.solicitudInventario = this.http.get<ProductoInventario[]>(this.inventarioUrl).pipe(
      timeout({ first: 15_000 }),
      tap(productos => {
        this.inventarioCache = productos;
        this.inventarioCacheCreado = Date.now();
      }),
      finalize(() => { this.solicitudInventario = null; }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    return this.solicitudInventario;
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
          this.inventarioCache = [
            ...this.inventarioCache.filter(item => item.id_producto !== producto.id_producto),
            producto
          ].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
          this.inventarioCacheCreado = Date.now();
        }
      })
    );
  }
}
