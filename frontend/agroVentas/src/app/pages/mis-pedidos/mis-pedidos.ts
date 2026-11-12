import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { PedidoHistorial, PedidoService } from '../../core/services/pedido.service';

/** Grupos con los que el cliente puede filtrar su historial (HU-08). */
export type FiltroPedidos = 'todos' | 'activos' | 'entregados' | 'cancelados';

interface OpcionFiltro {
  valor: FiltroPedidos;
  etiqueta: string;
}

/**
 * Estados que maneja hoy la base de datos, agrupados para el filtro.
 * Un estado que no esté aquí solo aparece en "Todos".
 */
const ESTADOS_POR_FILTRO: Record<Exclude<FiltroPedidos, 'todos'>, readonly string[]> = {
  activos: ['pendiente', 'confirmado', 'preparado'],
  entregados: ['entregado'],
  cancelados: ['cancelado', 'rechazado']
};

const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  preparado: 'Preparado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  rechazado: 'Rechazado'
};

/**
 * HU-08 — Consultar estado de pedidos.
 * Pantalla de solo consulta: muestra los pedidos del cliente que inició sesión
 * (el backend filtra por el usuario del token) con su estado, datos de entrega y valor.
 * Crear pedidos sigue en `/pedidos` (HU-07).
 */
@Component({
  selector: 'app-mis-pedidos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mis-pedidos.html',
  // Reutiliza los estilos de la pantalla de pedidos para mantener un solo diseño.
  styleUrls: ['../pedidos/pedidos.css', './mis-pedidos.css']
})
export class MisPedidos implements OnInit {
  private pedidoService = inject(PedidoService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  readonly filtros: OpcionFiltro[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'activos', etiqueta: 'En curso' },
    { valor: 'entregados', etiqueta: 'Entregados' },
    { valor: 'cancelados', etiqueta: 'Cancelados' }
  ];

  pedidos: PedidoHistorial[] = [];
  filtro: FiltroPedidos = 'todos';
  cargando = true;
  error = '';
  ultimaConsulta: Date | null = null;

  ngOnInit(): void {
    this.cargarPedidos();
  }

  /** Consulta los pedidos del cliente. También lo usa el botón "Actualizar". */
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

  /** Hora de la última consulta correcta, en formato colombiano (por ejemplo "1:21 p. m."). */
  get ultimaConsultaTexto(): string {
    if (!this.ultimaConsulta) return '';
    return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(this.ultimaConsulta);
  }

  seleccionarFiltro(filtro: FiltroPedidos): void {
    this.filtro = filtro;
  }

  get pedidosFiltrados(): PedidoHistorial[] {
    return this.pedidos.filter(pedido => this.perteneceAFiltro(pedido.estado, this.filtro));
  }

  contar(filtro: FiltroPedidos): number {
    return this.pedidos.filter(pedido => this.perteneceAFiltro(pedido.estado, filtro)).length;
  }

  private perteneceAFiltro(estado: string, filtro: FiltroPedidos): boolean {
    if (filtro === 'todos') return true;
    return ESTADOS_POR_FILTRO[filtro].includes(this.normalizarEstado(estado));
  }

  private normalizarEstado(estado: string): string {
    return estado?.trim().toLowerCase() ?? '';
  }

  etiquetaEstado(estado: string): string {
    const normalizado = this.normalizarEstado(estado);
    return ETIQUETAS_ESTADO[normalizado] ?? (normalizado || 'Sin estado');
  }

  claseVisualEstado(estado: string): string {
    const normalizado = this.normalizarEstado(estado);
    if (['confirmado', 'preparado', 'entregado'].includes(normalizado)) return 'exito';
    if (['cancelado', 'rechazado'].includes(normalizado)) return 'error';
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
