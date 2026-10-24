import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HorarioEntrega, PedidoService, ProductoPedido } from '../../core/services/pedido.service';

interface DiaCalendario {
  fecha: string | null;
  dia: number | null;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css'
})
export class Pedidos implements OnInit {
  private pedidoService = inject(PedidoService);

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
    this.construirCalendario();
    this.pedidoService.obtenerProductos().subscribe({
      next: productos => { this.productos = productos; this.cargandoProductos = false; },
      error: () => { this.error = 'No fue posible cargar el inventario. Intenta de nuevo más tarde.'; this.cargandoProductos = false; }
    });
    this.fechaEntrega = this.fechaMinima;
    this.mesCalendario = new Date();
    this.construirCalendario();
    this.cargarHorarios();
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
    this.pedidoService.obtenerHorarios(this.fechaEntrega).subscribe({
      next: horarios => {
        const porHora = new Map(horarios.map(horario => [horario.hora.slice(0, 5), horario]));
        this.horarios = this.horasEntrega.map(horario => {
          const remoto = porHora.get(horario.hora);
          return remoto ? { ...horario, ocupado: remoto.ocupado, disponible: remoto.disponible } : horario;
        });
        this.cargandoHorarios = false;
      },
      error: err => {
        this.error = err.error?.mensaje || 'No se pudo consultar qué horarios están ocupados. Puedes elegir una hora; el servidor volverá a verificarla al registrar.';
        this.cargandoHorarios = false;
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
    }).subscribe({
      next: () => {
        this.mensaje = 'Tu pedido fue registrado correctamente.';
        this.productoId = null;
        this.cantidad = null;
        this.horaEntrega = '';
        this.enviando = false;
        this.cargarHorarios();
      },
      error: err => {
        this.error = err.error?.mensaje || 'No fue posible registrar el pedido.';
        this.enviando = false;
        if (err.status === 409) this.cargarHorarios();
      }
    });
  }
}
