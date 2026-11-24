import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { ClientesService, ClienteComercial } from '../../core/services/clientes.service';
import { InventarioService } from '../../core/services/inventario.service';
import { HorarioEntrega, PedidoService, ProductoPedido } from '../../core/services/pedido.service';

type CanalPedido = 'whatsapp' | 'telefono' | 'presencial';
interface LineaCarrito { producto: ProductoPedido; cantidad: number }

@Component({
  selector: 'app-pedido-interno',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, RouterLink],
  templateUrl: './pedido-interno.html',
  styleUrl: './pedido-interno.css'
})
export class PedidoInterno implements OnInit {
  private pedidoService = inject(PedidoService);
  private clientesService = inject(ClientesService);
  private inventarioService = inject(InventarioService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  clientes: ClienteComercial[] = [];
  productos: ProductoPedido[] = [];
  horarios: HorarioEntrega[] = [];
  carrito: LineaCarrito[] = [];
  clienteId: number | null = null;
  canal: CanalPedido = 'whatsapp';
  productoId: number | null = null;
  cantidad: number | null = null;
  fechaEntrega = '';
  horaEntrega = '';
  readonly fechaMinima = this.fechaLocal(new Date());
  cargandoClientes = true;
  cargandoProductos = true;
  cargandoHorarios = false;
  enviando = false;
  error = '';
  mensaje = '';

  ngOnInit(): void {
    this.fechaEntrega = this.fechaMinima;
    this.cargarClientes();
    this.cargarProductos();
    this.cargarHorarios();
  }

  get productoSeleccionado(): ProductoPedido | undefined {
    return this.productos.find(producto => producto.id === Number(this.productoId));
  }

  get totalCarrito(): number {
    return this.carrito.reduce((total, linea) => total + Math.round(linea.producto.precio * linea.cantidad), 0);
  }

  get disponibleSeleccionado(): number {
    const producto = this.productoSeleccionado;
    if (!producto) return 0;
    const agregado = this.carrito.find(linea => linea.producto.id === producto.id)?.cantidad ?? 0;
    return Math.max(0, Math.round((producto.cantidad - agregado) * 10) / 10);
  }

  private cargarClientes(): void {
    this.clientesService.listar('', false).pipe(
      timeout({ first: 20_000 }), takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.cargandoClientes = false; this.cdr.markForCheck(); })
    ).subscribe({
      next: clientes => this.clientes = (clientes ?? []).filter(cliente => cliente.activo),
      error: error => this.error = error instanceof TimeoutError
        ? 'La consulta de clientes tardó demasiado.'
        : error.error?.mensaje || 'No fue posible cargar las fichas de clientes.'
    });
  }

  private cargarProductos(): void {
    this.cargandoProductos = true;
    this.pedidoService.obtenerProductos().pipe(
      timeout({ first: 25_000 }), takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.cargandoProductos = false; this.cdr.markForCheck(); })
    ).subscribe({
      next: productos => this.productos = (productos ?? []).filter(producto => producto.cantidad > 0 && producto.precio > 0),
      error: error => this.error = error instanceof TimeoutError
        ? 'La consulta del inventario tardó demasiado.'
        : error.error?.mensaje || 'No fue posible cargar el inventario disponible.'
    });
  }

  cambiarFecha(fecha: string): void {
    if (!fecha || fecha < this.fechaMinima) return;
    this.fechaEntrega = fecha;
    this.horaEntrega = '';
    this.cargarHorarios();
  }

  private cargarHorarios(): void {
    if (!this.fechaEntrega) return;
    this.cargandoHorarios = true;
    this.horaEntrega = '';
    this.pedidoService.obtenerHorarios(this.fechaEntrega).pipe(
      timeout({ first: 15_000 }), takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.cargandoHorarios = false; this.cdr.markForCheck(); })
    ).subscribe({
      next: horarios => this.horarios = horarios ?? [],
      error: error => {
        this.error = error instanceof TimeoutError
          ? 'La consulta de horarios tardó demasiado. Al guardar, el servidor volverá a verificar el bloque.'
          : error.error?.mensaje || 'No fue posible consultar los horarios; el servidor verificará que esté libre al guardar.';
        this.horarios = Array.from({ length: 9 }, (_, i) => ({ hora: `${String(i + 8).padStart(2, '0')}:00`, ocupado: false, disponible: true }));
      }
    });
  }

  agregarProducto(): void {
    this.error = '';
    const producto = this.productoSeleccionado;
    const cantidad = Number(this.cantidad);
    if (!producto || !Number.isFinite(cantidad) || cantidad <= 0) {
      this.error = 'Selecciona un producto y escribe una cantidad válida.';
      return;
    }
    if (cantidad > this.disponibleSeleccionado) {
      this.error = 'La cantidad solicitada supera el inventario disponible.';
      return;
    }
    if (producto.und === 'und' && !Number.isInteger(cantidad)) {
      this.error = 'La cantidad debe ser un número entero de unidades.';
      return;
    }
    if (producto.und === 'kg' && Math.abs(cantidad * 10 - Math.round(cantidad * 10)) > 1e-8) {
      this.error = 'La cantidad en kg debe usar incrementos de 0,1 kg.';
      return;
    }
    const existente = this.carrito.find(linea => linea.producto.id === producto.id);
    if (existente) existente.cantidad += cantidad;
    else this.carrito.push({ producto, cantidad });
    this.productoId = null;
    this.cantidad = null;
  }

  quitarProducto(id: number): void {
    this.carrito = this.carrito.filter(linea => linea.producto.id !== id);
  }

  registrar(): void {
    if (this.enviando) return;
    this.error = '';
    this.mensaje = '';
    if (!this.clienteId) { this.error = 'Selecciona la ficha comercial del cliente.'; return; }
    if (!this.carrito.length) { this.error = 'Agrega al menos un producto al carrito.'; return; }
    if (!this.fechaEntrega || !this.horaEntrega) { this.error = 'Selecciona la fecha y hora de entrega.'; return; }
    const horario = this.horarios.find(item => item.hora.slice(0, 5) === this.horaEntrega);
    if (horario && !horario.disponible) { this.error = 'Ese bloque no está disponible. Selecciona otro horario.'; return; }

    this.enviando = true;
    this.pedidoService.crearPedidoInterno({
      cliente_id: this.clienteId,
      canal_origen: this.canal,
      lineas: this.carrito.map(linea => ({ id_producto: linea.producto.id, cantidad: linea.cantidad })),
      fecha_entrega: this.fechaEntrega,
      hora_entrega: this.horaEntrega
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.enviando = false; this.cdr.markForCheck(); })
    ).subscribe({
      next: respuesta => {
        const id = respuesta.pedido?.id ? ` #${String(respuesta.pedido.id).slice(0, 8).toUpperCase()}` : '';
        this.mensaje = `Pedido interno${id} registrado correctamente.`;
        this.clienteId = null;
        this.carrito = [];
        this.productoId = null;
        this.cantidad = null;
        this.canal = 'whatsapp';
        this.horaEntrega = '';
        this.pedidoService.invalidarProductos();
        this.inventarioService.invalidarInventario();
        this.cargarProductos();
        this.cargarHorarios();
      },
      error: error => {
        this.error = error instanceof TimeoutError
          ? 'El registro tardó demasiado. Actualiza Gestión de pedidos antes de volver a enviarlo.'
          : error.status === 0 ? 'No se pudo conectar con el backend.'
            : error.error?.mensaje || 'No fue posible registrar el pedido interno.';
        if (error.status === 409) this.cargarHorarios();
      }
    });
  }

  private fechaLocal(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }
}
