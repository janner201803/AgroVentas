import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router} from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AbonoCartera, CarteraService, CuentaCartera } from '../../core/services/cartera.service';

type EstadoFiltro = '' | 'pendiente' | 'parcial' | 'pagada';

@Component({
  selector: 'app-cartera',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './cartera.html',
  styleUrl: './cartera.css'
})
export class Cartera implements OnInit {
  private carteraService = inject(CarteraService);
  private authService = inject(AuthService);
  private router = inject(Router);

  usuario = this.authService.usuario;
  etiquetaRol = this.authService.etiquetaRol;
  cuentas = signal<CuentaCartera[]>([]);
  cargando = signal(false);
  guardando = signal(false);
  error = signal('');
  mensaje = signal('');
  estadoFiltro: EstadoFiltro = '';
  cuentaAbono: number | null = null;
  valorAbono: number | null = null;
  metodoAbono: 'efectivo' | 'transferencia' = 'efectivo';
  notaAbono = '';

  get pendientes(): number {
    return this.cuentas().filter(cuenta => cuenta.estado !== 'pagada').length;
  }

  get saldoTotal(): number {
    return this.cuentas().reduce((total, cuenta) => total + Number(cuenta.saldo_pendiente), 0);
  }

  get recaudado(): number {
    return this.cuentas().reduce((total, cuenta) => total + cuenta.abonos.reduce((suma, abono) => suma + Number(abono.valor), 0), 0);
  }

  ngOnInit(): void { this.consultar(); }

  consultar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.carteraService.listar(this.estadoFiltro).subscribe({
      next: cuentas => this.cuentas.set(cuentas ?? []),
      error: error => this.error.set(error?.error?.mensaje || 'No fue posible consultar la cartera.'),
      complete: () => this.cargando.set(false)
    }).add(() => this.cargando.set(false));
  }

  mostrarAbono(cuenta: CuentaCartera): void {
    this.mensaje.set('');
    this.error.set('');
    this.cuentaAbono = this.cuentaAbono === cuenta.id ? null : cuenta.id;
    this.valorAbono = null;
    this.metodoAbono = 'efectivo';
    this.notaAbono = '';
  }

  registrarAbono(cuenta: CuentaCartera): void {
    const valor = Number(this.valorAbono);
    if (!Number.isFinite(valor) || valor <= 0) {
      this.error.set('Escribe un valor de abono mayor que cero.');
      return;
    }
    if (valor > Number(cuenta.saldo_pendiente)) {
      this.error.set('El abono no puede superar el saldo pendiente.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');
    this.carteraService.registrarAbono(cuenta.id, {
      valor,
      metodo_pago: this.metodoAbono,
      nota: this.notaAbono.trim() || null
    }).subscribe({
      next: respuesta => {
        this.mensaje.set(respuesta.mensaje || 'Abono registrado y saldo actualizado.');
        this.cuentaAbono = null;
        this.consultar();
      },
      error: error => this.error.set(error?.error?.mensaje || 'No fue posible registrar el abono.'),
      complete: () => this.guardando.set(false)
    }).add(() => this.guardando.set(false));
  }

  metodoPago(metodo: string): string {
    return metodo === 'transferencia' ? 'Transferencia' : 'Efectivo';
  }

  etiquetaEstado(estado: CuentaCartera['estado']): string {
    return estado === 'pagada' ? 'Pagada' : estado === 'parcial' ? 'Abono parcial' : 'Pendiente';
  }

  async cerrarSesion(): Promise<void> {
    await this.authService.cerrarSesion();
    await this.router.navigate(['/login']);
  }
}
