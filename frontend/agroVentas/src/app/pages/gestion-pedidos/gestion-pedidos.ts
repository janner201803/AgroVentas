import { Paginador } from '../../core/paginador';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TimeoutError } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { CambioEstadoPedido, PedidoGestion, PedidoService } from '../../core/services/pedido.service';
import {
  ACCION_HACIA,
  ESTADOS_POR_ATENDER,
  ETIQUETA_ESTADO,
  ETIQUETA_URGENCIA,
  EstadoPedido,
  TRANSICIONES,
  Urgencia,
  ahoraColombia,
  calcularUrgencia,
  normalizarEstado
} from '../../core/estados-pedido';

export type FiltroEstado = 'por_atender' | EstadoPedido | 'todos';

/** Pedido con los datos calculados que usa la pantalla. */
export interface PedidoVista extends PedidoGestion {
  estadoNormalizado: EstadoPedido | null;
  urgencia: Urgencia;
}

const RECARGA_AUTOMATICA_MS = 60_000;

/**
 * HU-12 Gestionar estado del pedido y HU-13 Consultar pedidos pendientes.
 * Pantalla del Propietario y el Empleado: lista los pedidos ordenados por entrega,
 * destaca los urgentes, filtra por estado, cliente y fecha, y cambia el estado.
 */
@Component({
  selector: 'app-gestion-pedidos',
  standalone: true,
  imports: [Paginador, CommonModule, FormsModule, RouterLink],
  templateUrl: './gestion-pedidos.html',
  styleUrls: ['../inventario/inventario.css', '../usuarios/usuarios.css', './gestion-pedidos.css']
})
export class GestionPedidos implements OnInit {
  private pedidoService = inject(PedidoService);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly etiquetaEstado = ETIQUETA_ESTADO;
  readonly accionHacia = ACCION_HACIA;
  readonly filtrosEstado: { valor: FiltroEstado; etiqueta: string }[] = [
    { valor: 'por_atender', etiqueta: 'Por atender' },
    { valor: 'pendiente', etiqueta: 'Pendientes' },
    { valor: 'en_preparacion', etiqueta: 'En preparación' },
    { valor: 'entregado', etiqueta: 'Entregados' },
    { valor: 'cancelado', etiqueta: 'Cancelados' },
    { valor: 'todos', etiqueta: 'Todos' }
  ];

  usuario = this.authService.usuario;
  etiquetaRol = this.authService.etiquetaRol;

  pedidos = signal<PedidoGestion[]>([]);
  cargando = signal(true);
  actualizando = signal(false);
  error = signal('');
  mensaje = signal('');
  ultimaConsulta = signal<Date | null>(null);
  cerrandoSesion = signal(false);
  /** Momento usado para calcular la urgencia; se renueva en cada consulta. */
  ahora = signal(ahoraColombia());

  filtroEstado = signal<FiltroEstado>('por_atender');
  busquedaCliente = signal('');
  desde = signal('');
  hasta = signal('');
  soloUrgentes = signal(false);

  guardando = signal<ReadonlySet<string>>(new Set());
  historialAbierto = signal<string | null>(null);
  historial = signal<CambioEstadoPedido[]>([]);
  cargandoHistorial = signal(false);
  errorHistorial = signal('');

  /** Pedidos con estado normalizado y urgencia calculada. */
  pedidosVista = computed<PedidoVista[]>(() => {
    const ahora = this.ahora();
    return this.pedidos().map(pedido => ({
      ...pedido,
      estadoNormalizado: normalizarEstado(pedido.estado),
      urgencia: calcularUrgencia(pedido.estado, pedido.fecha_entrega, pedido.hora_entrega, ahora)
    }));
  });

  /** HU-13: filtros por estado, cliente y fecha; orden por fecha y hora de entrega. */
  pedidosFiltrados = computed<PedidoVista[]>(() => {
    const filtro = this.filtroEstado();
    const termino = normalizarTexto(this.busquedaCliente());
    const desde = this.desde();
    const hasta = this.hasta();
    const soloUrgentes = this.soloUrgentes();

    const lista = this.pedidosVista()
      .filter(p => coincideEstado(p.estadoNormalizado, filtro))
      .filter(p => !termino || [p.cliente_nombre, p.cliente_correo, p.cliente_celular]
        .some(valor => normalizarTexto(valor).includes(termino)))
      .filter(p => !desde || (p.fecha_entrega ?? '') >= desde)
      .filter(p => !hasta || (p.fecha_entrega ?? '') <= hasta)
      .filter(p => !soloUrgentes || p.urgencia === 'atrasado' || p.urgencia === 'hoy');

    // Lo que falta por entregar va de lo más próximo a lo más lejano;
    // los pedidos cerrados, del más reciente al más antiguo.
    const cerrados = filtro === 'entregado' || filtro === 'cancelado' || filtro === 'todos';
    return lista.sort((a, b) => compararEntrega(a, b) * (cerrados ? -1 : 1));
  });

  resumen = computed(() => {
    const lista = this.pedidosVista();
    return {
      urgentes: lista.filter(p => p.urgencia === 'atrasado' || p.urgencia === 'hoy').length,
      atrasados: lista.filter(p => p.urgencia === 'atrasado').length,
      pendientes: lista.filter(p => p.estadoNormalizado === 'pendiente').length,
      enPreparacion: lista.filter(p => p.estadoNormalizado === 'en_preparacion').length,
      manana: lista.filter(p => p.urgencia === 'manana').length
    };
  });

  contadores = computed(() => {
    const lista = this.pedidosVista();
    return Object.fromEntries(
      this.filtrosEstado.map(({ valor }) => [valor, lista.filter(p => coincideEstado(p.estadoNormalizado, valor)).length])
    ) as Record<FiltroEstado, number>;
  });

  hayFiltrosExtra = computed(() =>
    Boolean(this.busquedaCliente() || this.desde() || this.hasta() || this.soloUrgentes())
  );

  constructor() {
    const intervalo = setInterval(() => this.actualizar(), RECARGA_AUTOMATICA_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalo));
  }

  ngOnInit(): void {
    this.cargar();
  }

  porId(_indice: number, pedido: PedidoVista): string {
    return pedido.id;
  }

  idCorto(id: string | null | undefined): string {
    return String(id ?? '').slice(0, 8).toUpperCase();
  }

  transiciones(pedido: PedidoVista): EstadoPedido[] {
    return pedido.estadoNormalizado ? TRANSICIONES[pedido.estadoNormalizado] : [];
  }

  estaGuardando(pedido: PedidoVista): boolean {
    return this.guardando().has(pedido.id);
  }

  limpiarFiltros(): void {
    this.busquedaCliente.set('');
    this.desde.set('');
    this.hasta.set('');
    this.soloUrgentes.set(false);
  }

  verUrgentes(): void {
    this.filtroEstado.set('por_atender');
    this.soloUrgentes.set(true);
  }

  /** Primera carga y reintento: muestra el indicador de carga. */
  cargar(): void {
    this.cargando.set(true);
    this.consultar(() => this.cargando.set(false));
  }

  /** Recarga sin ocultar la lista (botón Actualizar y recarga automática). */
  actualizar(): void {
    if (this.cargando() || this.actualizando()) return;
    this.actualizando.set(true);
    this.consultar(() => this.actualizando.set(false));
  }

  entregaPendiente = signal<string | null>(null);
  pago = 'efectivo';

  cambiarEstado(pedido: PedidoVista, estado: EstadoPedido, confirmado = false): void {
    if (this.estaGuardando(pedido)) return;
    const referencia = `el pedido #${this.idCorto(pedido.id)}`;
    if (estado === 'cancelado' && !confirm(`¿Cancelar ${referencia}? El stock reservado vuelve al inventario y no se puede deshacer.`)) return;
    if (estado === 'entregado' && !confirmado) {
      this.pago = pedido.metodo_pago === 'consignacion' ? 'transferencia' : 'efectivo';
      this.entregaPendiente.set(pedido.id);
      return;
    }

    this.error.set('');
    this.mensaje.set('');
    this.marcarGuardando(pedido.id, true);
    this.pedidoService.cambiarEstado(pedido.id, estado, undefined, estado === 'entregado' ? this.pago : undefined).subscribe({
      next: actualizado => {
        this.entregaPendiente.set(null);
        this.pedidos.update(lista => lista.map(p => (p.id === pedido.id
          ? { ...p, ...actualizado, ultimo_cambio_en: new Date().toISOString(), ultimo_cambio_por: this.usuario()?.email ?? p.ultimo_cambio_por }
          : p)));
        this.mensaje.set(`Pedido #${this.idCorto(pedido.id)}: ${ETIQUETA_ESTADO[estado]}.`);
        this.marcarGuardando(pedido.id, false);
        if (this.historialAbierto() === pedido.id) this.cargarHistorial(pedido.id);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No fue posible cambiar el estado.'));
        this.marcarGuardando(pedido.id, false);
      }
    });
  }

  alternarHistorial(pedido: PedidoVista): void {
    if (this.historialAbierto() === pedido.id) {
      this.historialAbierto.set(null);
      return;
    }
    this.historialAbierto.set(pedido.id);
    this.cargarHistorial(pedido.id);
  }

  etiquetaUrgenciaDe(urgencia: Urgencia): string {
    return urgencia ? ETIQUETA_URGENCIA[urgencia] : '';
  }

  etiquetaDe(estado: string | null): string {
    const normalizado = normalizarEstado(estado);
    return normalizado ? ETIQUETA_ESTADO[normalizado] : (estado || 'Nuevo');
  }

  formatearFecha(fecha: string | null | undefined): string {
    if (!fecha) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
      .format(new Date(`${fecha}T12:00:00Z`));
  }

  formatearHora(hora: string | null | undefined): string {
    return hora?.slice(0, 5) ?? '';
  }

  etiquetaPago(metodo: string): string {
    return metodo === 'efectivo' ? 'Efectivo' : metodo === 'consignacion' ? 'Consignación' : (metodo || '—');
  }

  async cerrarSesion(): Promise<void> {
    if (this.cerrandoSesion()) return;
    this.cerrandoSesion.set(true);
    try {
      await this.authService.cerrarSesion();
      await this.router.navigate(['/login']);
    } catch {
      this.error.set('No fue posible cerrar la sesión. Intenta de nuevo.');
    } finally {
      this.cerrandoSesion.set(false);
    }
  }

  private consultar(alTerminar: () => void): void {
    this.pedidoService.listarGestion().subscribe({
      next: pedidos => {
        this.pedidos.set(pedidos ?? []);
        this.ahora.set(ahoraColombia());
        this.ultimaConsulta.set(new Date());
        this.error.set('');
        alTerminar();
      },
      error: error => {
        this.error.set(mensajeError(error, 'No fue posible consultar los pedidos.'));
        alTerminar();
      }
    });
  }

  private cargarHistorial(id: string): void {
    this.cargandoHistorial.set(true);
    this.errorHistorial.set('');
    this.pedidoService.historialEstados(id).subscribe({
      next: cambios => {
        if (this.historialAbierto() === id) this.historial.set(cambios ?? []);
        this.cargandoHistorial.set(false);
      },
      error: error => {
        this.errorHistorial.set(mensajeError(error, 'No fue posible consultar el historial.'));
        this.cargandoHistorial.set(false);
      }
    });
  }

  private marcarGuardando(id: string, activo: boolean): void {
    this.guardando.update(actual => {
      const siguiente = new Set(actual);
      if (activo) siguiente.add(id); else siguiente.delete(id);
      return siguiente;
    });
  }
}

export function coincideEstado(estado: EstadoPedido | null, filtro: FiltroEstado): boolean {
  if (filtro === 'todos') return true;
  if (filtro === 'por_atender') return estado !== null && ESTADOS_POR_ATENDER.includes(estado);
  return estado === filtro;
}

function compararEntrega(a: PedidoGestion, b: PedidoGestion): number {
  const claveA = `${a.fecha_entrega ?? '9999-99-99'} ${(a.hora_entrega ?? '99:99').slice(0, 5)}`;
  const claveB = `${b.fecha_entrega ?? '9999-99-99'} ${(b.hora_entrega ?? '99:99').slice(0, 5)}`;
  return claveA.localeCompare(claveB);
}

function normalizarTexto(texto: string | null | undefined): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function mensajeError(error: any, porDefecto: string): string {
  if (error instanceof TimeoutError) return 'El servidor tardó demasiado en responder. Intenta de nuevo.';
  if (error?.status === 0) return 'No se pudo conectar con el servidor.';
  return error?.error?.mensaje || porDefecto;
}
