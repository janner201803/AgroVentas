import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';

export interface DatosCliente {
  nombre: string;
  telefono: string;
  direccion: string;
  observaciones: string;
}

export interface ClienteComercial extends DatosCliente {
  id: number;
  cuenta_id: string | null;
  correo_cuenta: string | null;
  nombre_cuenta: string | null;
  activo: boolean;
  creado_en: string;
  ventas_cantidad: number;
  ventas_total: number;
  saldo_pendiente_total: number;
  ultima_compra: string | null;
}

export interface AbonoClienteComercial {
  id: number;
  valor: number;
  metodo_pago: string;
  nota: string | null;
  registrado_en: string;
}

export interface VentaClienteComercial {
  id: number;
  pedido_id: string;
  total: number;
  metodo_pago: string;
  creado_en: string;
  lineas: { id_producto: number; nombre?: string; cantidad: number; unidad?: string; subtotal: number }[];
  fecha_entrega: string | null;
  hora_entrega: string | null;
  estado_pedido: string | null;
  saldo_pendiente: number | null;
  estado_cuenta: string | null;
  abonos: AbonoClienteComercial[];
}

export interface DetalleCliente extends ClienteComercial {
  ventas: VentaClienteComercial[];
}

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3001/api/clientes';

  listar(buscar = '', incluirInactivos = false): Observable<ClienteComercial[]> {
    const params: Record<string, string> = {};
    if (buscar.trim()) params['buscar'] = buscar.trim();
    if (incluirInactivos) params['incluirInactivos'] = 'true';
    return this.http.get<ClienteComercial[]>(this.apiUrl, { params }).pipe(timeout({ first: 20_000 }));
  }

  detalle(id: number): Observable<DetalleCliente> {
    return this.http.get<DetalleCliente>(`${this.apiUrl}/${id}`).pipe(timeout({ first: 20_000 }));
  }

  registrar(datos: DatosCliente & { correo: string }): Observable<{ mensaje: string; id: number }> {
    return this.http.post<{ mensaje: string; id: number }>(this.apiUrl, datos).pipe(timeout({ first: 20_000 }));
  }

  actualizar(id: number, datos: DatosCliente & { activo?: boolean }): Observable<{ mensaje: string; cliente: ClienteComercial }> {
    return this.http.patch<{ mensaje: string; cliente: ClienteComercial }>(`${this.apiUrl}/${id}`, datos).pipe(timeout({ first: 20_000 }));
  }
}
