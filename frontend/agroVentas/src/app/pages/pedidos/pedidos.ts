import { Component, DestroyRef, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HorarioEntrega, PedidoHistorial, PedidoService, ProductoPedido } from '../../core/services/pedido.service';
import { InventarioService } from '../../core/services/inventario.service';
import { ChangeDetectorRef } from '@angular/core';


interface DiaCalendario {
  fecha: string | null;
  dia: number | null;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css',
  // HU-08: estilos del botón "Actualizar" aquí, para no modificar pedidos.css (PR #11).
  styles: [`
    .actualizar-pedidos {
      margin: 0;
      padding: 8px 14px;
      border: 1px solid #287344;
      background: #fff;
      color: #287344;
      font-size: 14px;
      white-space: nowrap;
    }
  `]
})
export class Pedidos implements OnInit, OnDestroy {
  private pedidoService = inject(PedidoService);
  private inventarioService = inject(InventarioService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private reintentoProductos: ReturnType<typeof setTimeout> | null = null;

  productos: ProductoPedido[] = [];
  pedidos: PedidoHistorial[] = [];
  horarios: HorarioEntrega[] = [];
  readonly horasEntrega: HorarioEntrega[] = Array.from({ length: 9 }, (_, indice) => ({
    hora: `${String(indice + 8).padStart(2, '0')}:00`, ocupado: false, disponible: true
  }));
  productoId: number | null = null;
  cantidad: number | null = null;
  metodoPago: 'efectivo' = 'efectivo';
  enviando = false;
  mensaje = '';
  error = '';
  cargandoProductos = true;
  cargandoPedidos = true;
  cargandoHorarios = false;
  errorPedidos = '';
  actualizandoPedidos = false;
  fechaEntrega = '';
  horaEntrega = '';
  readonly fechaMinima = this.fechaLocal(new Date());
  mesCalendario = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  diasCalendario: DiaCalendario[] = [];
  readonly diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  get nombreMes(): string {
    return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(this.mesCalendario);
  }

  get fechaSeleccionadaTexto(): string {
    if (!this.fechaEntrega) return '';
    return new Intl.DateTimeFormat('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    }).format(new Date(`${this.fechaEntrega}T12:00:00Z`));
  }

  ngOnInit(): void {
    this.construirCalendario();
    this.cargarProductos();
    this.cargarPedidos();
    this.fechaEntrega = this.fechaMinima;
    this.mesCalendario = new Date();
    this.construirCalendario();
    this.cargarHorarios();
  }

  ngOnDestroy(): void {
    if (this.reintentoProductos) clearTimeout(this.reintentoProductos);
  }

  private cargarProductos(): void {
    if (this.reintentoProductos) clearTimeout(this.reintentoProductos);
    this.reintentoProductos = null;
    this.cargandoProductos = true;
    this.pedidoService.obtenerProductos().pipe(
      timeout({ first: 35_000 }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.cargandoProductos = false; this.cdr.markForCheck(); })
    ).subscribe({
      next: productos => {
        this.productos = productos.filter(producto => Number(producto.cantidad) > 0 && Number(producto.precio) > 0);
        if (this.productoId != null && !this.productos.some(producto => producto.id === Number(this.productoId))) {
          this.productoId = null;
          this.cantidad = null;
        }
        this.error = '';
      },
      error: err => {
        const detalle = err instanceof TimeoutError
          ? 'La consulta del inventario tardó demasiado.'
          : err.error?.mensaje || 'No fue posible cargar los productos del inventario.';
        this.error = `${detalle} Volveré a intentarlo automáticamente.`;
        this.reintentoProductos = setTimeout(() => this.cargarProductos(), 5_000);
      }
    });
  }

  cargarPedidos(): void {
    this.errorPedidos = '';
    this.cargandoPedidos = true;
    this.pedidoService.listarPedidos().pipe(
      timeout({ first: 20_000 }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.cargandoPedidos = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: pedidos => {
        this.pedidos = pedidos;
        this.cdr.markForCheck();
      },
      error: err => {
        this.errorPedidos = err instanceof TimeoutError
          ? 'La consulta de tus pedidos tardó demasiado.'
          : err.error?.mensaje || 'No fue posible cargar tu historial de pedidos.';
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * HU-08: vuelve a consultar el historial para ver el estado más reciente
   * sin recargar la página. Mantiene la lista visible mientras consulta.
   */
  actualizarPedidos(): void {
    if (this.cargandoPedidos || this.actualizandoPedidos) return;
    this.actualizandoPedidos = true;
    this.pedidoService.listarPedidos().pipe(
      timeout({ first: 20_000 }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.actualizandoPedidos = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: pedidos => {
        this.pedidos = pedidos;
        this.errorPedidos = '';
      },
      error: err => {
        // Un fallo se muestra como error, nunca como historial vacío.
        this.errorPedidos = err instanceof TimeoutError
          ? 'La consulta de tus pedidos tardó demasiado.'
          : err.error?.mensaje || 'No fue posible actualizar tu historial de pedidos.';
      }
    });
  }

  /** HU-08: los primeros 8 caracteres del id, suficientes para reconocer el pedido. */
  idCorto(id: string | number | null | undefined): string {
    return String(id ?? '').slice(0, 8).toUpperCase();
  }

  etiquetaEstado(estado: string): string {
    const etiquetas: Record<string, string> = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      preparado: 'Preparado',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
      rechazado: 'Rechazado'
    };
    const normalizado = estado?.trim().toLowerCase();
    return etiquetas[normalizado] ?? (normalizado || 'Sin estado');
  }

  claseVisualEstado(estado: string): string {
    const normalizado = estado?.trim().toLowerCase();
    if (['confirmado', 'preparado', 'entregado'].includes(normalizado)) return 'exito';
    if (['cancelado', 'rechazado'].includes(normalizado)) return 'error';
    return '';
  }

  formatearHora(hora: string): string {
    return hora?.slice(0, 5) ?? '';
  }

  formatearFecha(fecha: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'long',
      timeZone: 'UTC'
    }).format(new Date(`${fecha}T12:00:00Z`));
  }

  private fechaLocal(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private construirCalendario(): void {
    const primero = new Date(this.mesCalendario.getFullYear(), this.mesCalendario.getMonth(), 1);
    const desplazamiento = (primero.getDay() + 6) % 7;
    const diasEnMes = new Date(this.mesCalendario.getFullYear(), this.mesCalendario.getMonth() + 1, 0).getDate();
    this.diasCalendario = Array.from({ length: 42 }, (_, indice) => {
      const dia = indice - desplazamiento + 1;
      if (dia < 1 || dia > diasEnMes) return { fecha: null, dia: null };
      return { fecha: this.fechaLocal(new Date(this.mesCalendario.getFullYear(), this.mesCalendario.getMonth(), dia, 12)), dia };
    });
  }

  cambiarMes(delta: number): void {
    const nuevoMes = new Date(this.mesCalendario.getFullYear(), this.mesCalendario.getMonth() + delta, 1);
    const hoy = new Date(`${this.fechaMinima}T12:00:00`);
    const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    if (nuevoMes < mesActual) return;
    this.mesCalendario = nuevoMes;
    this.construirCalendario();
  }

  seleccionarFecha(fecha: string): void {
    if (fecha < this.fechaMinima) return;
    this.error = '';
    this.fechaEntrega = fecha;
    this.horaEntrega = '';
    const seleccion = new Date(`${fecha}T12:00:00`);
    this.mesCalendario = new Date(seleccion.getFullYear(), seleccion.getMonth(), 1);
    this.construirCalendario();
    this.cargarHorarios();
  }

  private cargarHorarios(): void {
    if (!this.fechaEntrega) return;
    this.cargandoHorarios = true;
    this.horaEntrega = '';
    this.horarios = this.horasEntrega.map(horario => ({ ...horario }));
    this.pedidoService.obtenerHorarios(this.fechaEntrega).pipe(
      timeout({ first: 15_000 }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.cargandoHorarios = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: horarios => {
        const porHora = new Map(horarios.map(horario => [horario.hora.slice(0, 5), horario]));
        this.horarios = this.horasEntrega.map(horario => {
          const remoto = porHora.get(horario.hora);
          return remoto ? { ...horario, ocupado: remoto.ocupado, disponible: remoto.disponible } : horario;
        });
        this.cdr.markForCheck();
      },
      error: err => {
        this.error = err instanceof TimeoutError
          ? 'La consulta de horarios tardó demasiado. Puedes elegir una hora; el servidor verificará que siga libre.'
          : err.error?.mensaje || 'No se pudo consultar qué horarios están ocupados. Puedes elegir una hora; el servidor volverá a verificarla al registrar.';
        this.cdr.markForCheck();
      }
    });
  }

  seleccionarHora(hora: string): void {
    if (this.horarios.find(item => item.hora === hora)?.disponible) this.horaEntrega = hora;
  }

  get productoSeleccionado(): ProductoPedido | undefined {
    return this.productos.find(producto => producto.id === Number(this.productoId));
  }

  get valorEstimado(): number {
    const producto = this.productoSeleccionado;
    if (!producto || this.cantidad == null || this.cantidad <= 0) return 0;
    return producto.precio * this.cantidad;
  }

  enviarPedido(): void {
    this.error = '';
    this.mensaje = '';
    if (this.cargandoProductos || this.cargandoHorarios) {
      this.error = 'Espera a que terminen de cargar los productos y horarios.';
      return;
    }
    const producto = this.productoSeleccionado;
    if (!producto || this.cantidad == null || this.cantidad <= 0) {
      this.error = 'Selecciona un producto e indica una cantidad válida.';
      return;
    }
    if (this.cantidad > producto.cantidad) {
      this.error = 'La cantidad solicitada supera el inventario disponible.';
      return;
    }
    if (producto.und === 'und' && !Number.isInteger(this.cantidad)) {
      this.error = 'La cantidad solicitada debe ser un número entero de unidades.';
      return;
    }
    if (producto.und === 'kg' && Math.abs(this.cantidad * 10 - Math.round(this.cantidad * 10)) > 1e-8) {
      this.error = 'La cantidad en kg debe usar incrementos de 0,1 kg.';
      return;
    }
    if (!this.fechaEntrega || !this.horaEntrega || !this.horarios.some(item => item.hora === this.horaEntrega && item.disponible)) {
      this.error = 'Selecciona una fecha y un horario disponible.';
      return;
    }
    this.enviando = true;
    this.pedidoService.crearPedido({
      id_producto: producto.id,
      cantidad: this.cantidad,
      metodo_pago: this.metodoPago,
      fecha_entrega: this.fechaEntrega,
      hora_entrega: this.horaEntrega
    }).pipe(
      timeout({ first: 35_000 }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.enviando = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.mensaje = '¡Pedido realizado correctamente! Ya quedó registrado.';
        this.productoId = null;
        this.cantidad = null;
        this.metodoPago = 'efectivo';
        this.fechaEntrega = this.fechaMinima;
        this.horaEntrega = '';
        this.mesCalendario = new Date();
        this.construirCalendario();
        this.pedidoService.invalidarProductos();
        this.inventarioService.invalidarInventario();
        this.cargarProductos();
        this.cargarPedidos();
        this.cdr.markForCheck();
        this.cargarHorarios();
      },
      error: err => {
        this.error = err instanceof TimeoutError
          ? 'El registro del pedido tardó demasiado. Consulta tus pedidos antes de volver a enviarlo.'
          : err.status === 0
            ? 'No se pudo conectar con el backend. Verifica que esté iniciado y vuelve a intentar.'
            : err.error?.mensaje || 'No fue posible registrar el pedido.';
        if (err.status === 409) this.cargarHorarios();
        this.cdr.markForCheck();
      }
    });
  }
}
