import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, concat, finalize, of, shareReplay, tap, timeout } from 'rxjs';
import { ProductoPedido } from './pedido.service';

export interface NuevoProducto {
  nombre: string;
  cantidad: number;
  precio: number;
  und: 'kg' | 'und';
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3001/api/inventario';
  private readonly cacheMs = 20_000;
  private productosCache: ProductoPedido[] | null = null;
  private cacheCreadaEn = 0;
  private solicitudEnCurso: Observable<ProductoPedido[]> | null = null;

  listar(forzar = false): Observable<ProductoPedido[]> {
    if (!forzar && this.productosCache) {
      const productosCache = this.productosCache;
      if (Date.now() - this.cacheCreadaEn < this.cacheMs) return of(productosCache);
      return concat(of(productosCache), this.cargarDesdeApi());
    }
    return this.cargarDesdeApi();
  }

  private cargarDesdeApi(): Observable<ProductoPedido[]> {
    if (this.solicitudEnCurso) return this.solicitudEnCurso;

    this.solicitudEnCurso = this.http.get<ProductoPedido[]>(this.apiUrl).pipe(
      timeout({ first: 35_000 }),
      tap(productos => {
        this.productosCache = productos;
        this.cacheCreadaEn = Date.now();
      }),
      finalize(() => { this.solicitudEnCurso = null; }),
      // Si se sale de la página, cancela la consulta para que la siguiente
      // visita pueda iniciar una petición nueva y no herede una solicitud trabada.
      shareReplay({ bufferSize: 1, refCount: true })
    );
    return this.solicitudEnCurso;
  }

  crear(producto: NuevoProducto): Observable<{ mensaje: string; producto: ProductoPedido }> {
    return this.http.post<{ mensaje: string; producto: ProductoPedido }>(this.apiUrl, producto).pipe(
      timeout({ first: 35_000 }),
      tap(({ producto: nuevo }) => {
        if (this.productosCache) {
          this.productosCache = [...this.productosCache.filter(item => item.id !== nuevo.id), nuevo]
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
          this.cacheCreadaEn = Date.now();
        }
      })
    );
  }

}
