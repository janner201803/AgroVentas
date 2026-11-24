import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EncabezadoSeccion } from '../../core/encabezado-seccion';
import {
  ClienteComercial,
  ClientesService,
  DatosCliente,
  DetalleCliente,
  VentaClienteComercial
} from '../../core/services/clientes.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe, EncabezadoSeccion],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css'
})
export class Clientes implements OnInit {
  private clientesService = inject(ClientesService);

  nuevo: DatosCliente & { correo: string } = { nombre: '', telefono: '', direccion: '', observaciones: '', correo: '' };
  edicion: DatosCliente = { nombre: '', telefono: '', direccion: '', observaciones: '' };
  buscar = '';
  incluirInactivos = false;
  clientes = signal<ClienteComercial[]>([]);
  detalle = signal<DetalleCliente | null>(null);
  cargando = signal(false);
  cargandoDetalle = signal(false);
  guardando = signal(false);
  error = signal('');
  mensaje = signal('');
  editando = signal(false);

  ngOnInit(): void { this.consultar(); }

  consultar(): void {
    this.error.set('');
    this.cargando.set(true);
    this.clientesService.listar(this.buscar, this.incluirInactivos).subscribe({
      next: lista => this.clientes.set(lista ?? []),
      error: error => this.error.set(error?.error?.mensaje || 'No fue posible consultar las fichas comerciales.'),
      complete: () => this.cargando.set(false)
    }).add(() => this.cargando.set(false));
  }

  registrar(): void {
    if (this.guardando()) return;
    this.error.set('');
    this.mensaje.set('');
    this.guardando.set(true);
    this.clientesService.registrar({ ...this.nuevo }).subscribe({
      next: respuesta => {
        this.mensaje.set(respuesta.mensaje || 'Ficha comercial registrada.');
        this.nuevo = { nombre: '', telefono: '', direccion: '', observaciones: '', correo: '' };
        this.consultar();
      },
      error: error => this.error.set(error?.error?.mensaje || 'No fue posible registrar la ficha comercial.'),
      complete: () => this.guardando.set(false)
    }).add(() => this.guardando.set(false));
  }

  verDetalle(cliente: ClienteComercial): void {
    if (this.detalle()?.id === cliente.id) {
      this.detalle.set(null);
      this.editando.set(false);
      return;
    }
    this.error.set('');
    this.detalle.set(null);
    this.editando.set(false);
    this.cargandoDetalle.set(true);
    this.clientesService.detalle(cliente.id).subscribe({
      next: detalle => this.detalle.set(detalle),
      error: error => this.error.set(error?.error?.mensaje || 'No fue posible cargar el historial del cliente.'),
      complete: () => this.cargandoDetalle.set(false)
    }).add(() => this.cargandoDetalle.set(false));
  }

  iniciarEdicion(cliente: DetalleCliente): void {
    this.edicion = {
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      observaciones: cliente.observaciones ?? ''
    };
    this.editando.set(true);
    this.error.set('');
  }

  guardarEdicion(cliente: DetalleCliente, activo = cliente.activo): void {
    if (this.guardando()) return;
    this.error.set('');
    this.mensaje.set('');
    this.guardando.set(true);
    this.clientesService.actualizar(cliente.id, { ...this.edicion, activo }).subscribe({
      next: respuesta => {
        this.mensaje.set(respuesta.mensaje || 'Ficha comercial actualizada.');
        this.editando.set(false);
        this.consultar();
        this.detalle.set(null);
        this.verDetalle({...cliente, ...this.edicion, activo});
      },
      error: error => this.error.set(error?.error?.mensaje || 'No fue posible actualizar la ficha comercial.'),
      complete: () => this.guardando.set(false)
    }).add(() => this.guardando.set(false));
  }

  cambiarActivo(cliente: DetalleCliente): void {
    const nuevoEstado = !cliente.activo;
    const accion = nuevoEstado ? 'reactivar' : 'desactivar';
    if (!confirm(`¿Quieres ${accion} la ficha de ${cliente.nombre}? Sus ventas, pedidos y abonos se conservarán.`)) return;
    this.edicion = {
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      observaciones: cliente.observaciones ?? ''
    };
    this.guardarEdicion(cliente, nuevoEstado);
  }

  etiquetaPago(metodo: string): string {
    if (metodo === 'credito') return 'Crédito';
    if (metodo === 'transferencia' || metodo === 'consignacion') return 'Transferencia';
    return 'Efectivo';
  }

  saldo(cliente: VentaClienteComercial): number {
    return Number(cliente.saldo_pendiente ?? 0);
  }
}
