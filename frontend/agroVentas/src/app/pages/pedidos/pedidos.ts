import { Component, DestroyRef, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Encabezado } from '../../shared/encabezado/encabezado';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HorarioEntrega, PedidoService, ProductoPedido } from '../../core/services/pedido.service';
import { InventarioService } from '../../core/services/inventario.service';
import { ChangeDetectorRef } from '@angular/core';


interface DiaCalendario {
  fecha: string | null;
  dia: number | null;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Encabezado],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css'
})
export class Pedidos implements OnInit, OnDestroy {
  private pedidoService = inject(PedidoService);
  private inventarioService = inject(InventarioService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private host: ElementRef<HTMLElement> = inject(ElementRef);
  /** Variedad elegida en la lista de precios (/pedidos?producto=ID). Se usa una sola vez. */
  private productoSolicitado: number | null = null;
  private reintentoProductos: ReturnType<typeof setTimeout> | null = null;

  productos: ProductoPedido[] = [];
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
  /** Campo junto al que se repite el error de validación (además del aviso general). */
  errorCampo: 'producto' | 'cantidad' | 'horario' | null = null;
  /** Día que recibe el foco del teclado en el calendario. */
  private fechaConFoco = '';
  cargandoProductos = true;
  cargandoHorarios = false;
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
    const solicitado = Number(this.route.snapshot.queryParamMap.get('producto'));
    this.productoSolicitado = Number.isInteger(solicitado) && solicitado > 0 ? solicitado : null;
    this.construirCalendario();
    this.cargarProductos();
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
        if (this.productoId == null && this.productos.some(producto => producto.id === this.productoSolicitado)) {
          this.productoId = this.productoSolicitado;
        }
        this.productoSolicitado = null;
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

  /** Día del calendario que entra en el orden de tabulación: uno solo, el resto se recorre con flechas. */
  get fechaFoco(): string {
    const visibles = this.diasCalendario.map(celda => celda.fecha).filter((fecha): fecha is string => !!fecha);
    for (const candidata of [this.fechaConFoco, this.fechaEntrega]) {
      if (candidata && visibles.includes(candidata)) return candidata;
    }
    return visibles.find(fecha => fecha >= this.fechaMinima) ?? '';
  }

  /** "viernes, 13 de noviembre de 2026": nombre accesible de cada día del calendario. */
  fechaTexto(fecha: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    }).format(new Date(`${fecha}T12:00:00Z`));
  }

  /** "09:00" → "9:00 a. m." */
  horaTexto(hora: string): string {
    const [horas, minutos] = hora.split(':').map(Number);
    return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
      .format(new Date(2000, 0, 1, horas, minutos || 0));
  }

  /** Flechas del teclado: mueven el foco entre días (y de mes si hace falta). Enter o espacio eligen. */
  teclaCalendario(evento: KeyboardEvent, fecha: string): void {
    const pasos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const paso = pasos[evento.key];
    if (!paso) return;
    evento.preventDefault();
    const destino = new Date(`${fecha}T12:00:00`);
    destino.setDate(destino.getDate() + paso);
    const nueva = this.fechaLocal(destino);
    if (nueva < this.fechaMinima) return;
    if (!this.diasCalendario.some(celda => celda.fecha === nueva)) {
      this.mesCalendario = new Date(destino.getFullYear(), destino.getMonth(), 1);
      this.construirCalendario();
    }
    this.fechaConFoco = nueva;
    this.cdr.markForCheck();
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>(`[data-fecha="${nueva}"]`)?.focus());
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
    this.errorCampo = null;
    this.mensaje = '';
    if (this.cargandoProductos || this.cargandoHorarios) {
      this.error = 'Espera a que terminen de cargar los productos y horarios.';
      return;
    }
    const producto = this.productoSeleccionado;
    if (!producto || this.cantidad == null || this.cantidad <= 0) {
      this.error = 'Selecciona un producto e indica una cantidad válida.';
      this.errorCampo = producto ? 'cantidad' : 'producto';
      return;
    }
    if (this.cantidad > producto.cantidad) {
      this.error = 'La cantidad solicitada supera el inventario disponible.';
      this.errorCampo = 'cantidad';
      return;
    }
    if (producto.und === 'und' && !Number.isInteger(this.cantidad)) {
      this.error = 'La cantidad solicitada debe ser un número entero de unidades.';
      this.errorCampo = 'cantidad';
      return;
    }
    if (producto.und === 'kg' && Math.abs(this.cantidad * 10 - Math.round(this.cantidad * 10)) > 1e-8) {
      this.error = 'La cantidad en kg debe usar incrementos de 0,1 kg.';
      this.errorCampo = 'cantidad';
      return;
    }
    if (!this.fechaEntrega || !this.horaEntrega || !this.horarios.some(item => item.hora === this.horaEntrega && item.disponible)) {
      this.error = 'Selecciona una fecha y un horario disponible.';
      this.errorCampo = 'horario';
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
        this.mensaje = 'Pedido registrado. Quedó como pendiente.';
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
