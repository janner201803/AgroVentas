import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { PedidoHistorial, PedidoService } from '../../core/services/pedido.service';
import { ETIQUETA_ESTADO, EstadoPedido, normalizarEstado } from '../../core/estados-pedido';

/** Grupos con los que el cliente puede filtrar su historial (HU-08). */
export type FiltroPedidos = 'todos' | 'activos' | 'entregados' | 'cancelados';

interface OpcionFiltro {
  valor: FiltroPedidos;
  etiqueta: string;
}

interface OpcionSemana {
  valor: string;
  etiqueta: string;
}

const ESTADOS_POR_FILTRO: Record<Exclude<FiltroPedidos, 'todos'>, readonly EstadoPedido[]> = {
  activos: ['pendiente', 'en_preparacion'],
  entregados: ['entregado'],
  cancelados: ['cancelado']
};

/**
 * HU-08 — Consultar estado de pedidos.
 * Pantalla de solo consulta. Se puede filtrar por estado y por semana de entrega
 * (la semana va de lunes a domingo, igual que el calendario de /pedidos).
 */
@Component({
  selector: 'app-mis-pedidos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mis-pedidos.html',
  styleUrls: ['../pedidos/pedidos.css', './mis-pedidos.css']
})
export class MisPedidos implements OnInit {
  private pedidoService = inject(PedidoService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  readonly filtros: OpcionFiltro[] = [
    { valor: 'todos', etiqueta: 'Todos los estados' },
    { valor: 'activos', etiqueta: 'En curso' },
    { valor: 'entregados', etiqueta: 'Entregados' },
    { valor: 'cancelados', etiqueta: 'Cancelados' }
  ];

  pedidos: PedidoHistorial[] = [];
  filtro: FiltroPedidos = 'todos';
  /** null = todas las semanas · 0 = esta semana · -1 = la anterior · 1 = la siguiente… */
  semanaOffset: number | null = null;
  cargando = true;
  actualizando = false;
  error = '';
  ultimaConsulta: Date | null = null;
  /** Pedidos con el detalle desplegado ("Ver detalles"). */
  private expandidos = new Set<string>();

  ngOnInit(): void {
    this.cargarPedidos();
  }

  cargarPedidos(): void {
    this.error = '';
    this.cargando = true;
    this.pedidoService.listarPedidos().pipe(
      timeout({ first: 20_000 }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.cargando = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: pedidos => {
        this.pedidos = pedidos ?? [];
        this.ultimaConsulta = new Date();
        this.cdr.markForCheck();
      },
      error: err => {
        this.error = err instanceof TimeoutError
          ? 'La consulta de tus pedidos tardó demasiado.'
          : err.status === 0
            ? 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.'
            : err.error?.mensaje || 'No fue posible cargar tus pedidos.';
        this.cdr.markForCheck();
      }
    });
  }

  get ultimaConsultaTexto(): string {
    if (!this.ultimaConsulta) return '';
    return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(this.ultimaConsulta);
  }

  actualizar(): void {
    if (this.cargando || this.actualizando) return;
    this.actualizando = true;
    this.pedidoService.listarPedidos().pipe(
      timeout({ first: 20_000 }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.actualizando = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: pedidos => {
        this.pedidos = pedidos ?? [];
        this.error = '';
        this.ultimaConsulta = new Date();
      },
      error: err => {
        this.error = err instanceof TimeoutError
          ? 'La consulta de tus pedidos tardó demasiado.'
          : err.error?.mensaje || 'No fue posible actualizar tu historial de pedidos.';
      }
    });
  }

  idCorto(id: string | number | null | undefined): string {
    return String(id ?? '').slice(0, 8).toUpperCase();
  }

  // ───────── Detalle desplegable ─────────

  estaExpandido(id: string | number): boolean {
    return this.expandidos.has(String(id));
  }

  alternarDetalle(id: string | number): void {
    const clave = String(id);
    if (this.expandidos.has(clave)) this.expandidos.delete(clave);
    else this.expandidos.add(clave);
  }

  /** "0.1 Kg", "1 und" o "3 productos" para la fila resumida del pedido. */
  resumenCantidad(pedido: PedidoHistorial): string {
    const lineas = pedido.lineas ?? [];
    if (lineas.length > 1) return `${lineas.length} productos`;
    if (lineas.length === 1) return `${lineas[0].cantidad} ${lineas[0].unidad}`;
    return `${pedido.cantidad} ${pedido.producto_unidad || 'unidades'}`;
  }

  // ───────── Filtro por estado ─────────

  seleccionarFiltro(filtro: FiltroPedidos): void {
    this.filtro = filtro;
  }

  // ───────── Filtro por semana ─────────

  /** Valor que usa el selector: "todas" o el desplazamiento (-1, 0, 1…). */
  get valorSemana(): string {
    return this.semanaOffset === null ? 'todas' : String(this.semanaOffset);
  }

  seleccionarSemana(valor: string): void {
    this.semanaOffset = valor === 'todas' ? null : Number(valor);
  }

  get opcionesSemana(): OpcionSemana[] {
    const nombres: Record<number, string> = { [-1]: 'Semana pasada', 0: 'Esta semana', 1: 'Próxima semana' };
    const opciones: OpcionSemana[] = [{ valor: 'todas', etiqueta: 'Todas las semanas' }];
    for (const offset of [-4, -3, -2, -1, 0, 1, 2]) {
      const rango = this.rangoSemana(offset);
      opciones.push({
        valor: String(offset),
        etiqueta: nombres[offset] ? `${nombres[offset]} · ${rango}` : rango
      });
    }
    return opciones;
  }

  limpiarFiltros(): void {
    this.filtro = 'todos';
    this.semanaOffset = null;
  }

  /** Lunes de la semana indicada (a las 12:00 para evitar problemas de zona horaria). */
  private lunesDeSemana(offset: number): Date {
    const lunes = new Date();
    lunes.setHours(12, 0, 0, 0);
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7) + offset * 7);
    return lunes;
  }

  private rangoSemana(offset: number): string {
    const formato = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
    const lunes = this.lunesDeSemana(offset);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return `${formato.format(lunes)} – ${formato.format(domingo)}`;
  }

  private enSemanaSeleccionada(fecha: string): boolean {
    if (this.semanaOffset === null) return true;
    if (!fecha) return false;
    const entrega = new Date(`${fecha.slice(0, 10)}T12:00:00`);
    const lunes = this.lunesDeSemana(this.semanaOffset);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return entrega >= lunes && entrega <= domingo;
  }

  get etiquetaSemana(): string {
    if (this.semanaOffset === null) return 'Todas las semanas';
    const rango = this.rangoSemana(this.semanaOffset);
    return this.semanaOffset === 0 ? `Esta semana · ${rango}` : rango;
  }

  // ───────── Resultados ─────────

  get pedidosEnSemana(): PedidoHistorial[] {
    return this.pedidos.filter(pedido => this.enSemanaSeleccionada(pedido.fecha_entrega));
  }

  get totalEnSemana(): number {
    return this.pedidosEnSemana.length;
  }

  get pedidosFiltrados(): PedidoHistorial[] {
    return this.pedidosEnSemana.filter(pedido => this.perteneceAFiltro(pedido.estado, this.filtro));
  }

  /** Los contadores respetan la semana elegida. */
  contar(filtro: FiltroPedidos): number {
    return this.pedidosEnSemana.filter(pedido => this.perteneceAFiltro(pedido.estado, filtro)).length;
  }

  private perteneceAFiltro(estado: string, filtro: FiltroPedidos): boolean {
    if (filtro === 'todos') return true;
    const normalizado = normalizarEstado(estado);
    return normalizado !== null && ESTADOS_POR_FILTRO[filtro].includes(normalizado);
  }

  etiquetaEstado(estado: string): string {
    const normalizado = normalizarEstado(estado);
    if (normalizado) return ETIQUETA_ESTADO[normalizado];
    return estado?.trim() || 'Sin estado';
  }

  claseVisualEstado(estado: string): string {
    const normalizado = normalizarEstado(estado);
    if (normalizado === 'en_preparacion' || normalizado === 'entregado') return 'exito';
    if (normalizado === 'cancelado') return 'error';
    return '';
  }

  formatearHora(hora: string): string {
    return hora?.slice(0, 5) ?? '';
  }

  /** La fecha de entrega llega como AAAA-MM-DD; se muestra sin depender de la zona horaria del navegador. */
  formatearFecha(fecha: string): string {
    if (!fecha) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'long',
      timeZone: 'UTC'
    }).format(new Date(`${fecha}T12:00:00Z`));
  }

  etiquetaPago(metodo: string): string {
    return metodo === 'efectivo' ? 'Efectivo' : 'Consignación';
  }
}