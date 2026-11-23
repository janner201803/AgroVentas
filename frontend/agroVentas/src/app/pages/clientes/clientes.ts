import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EncabezadoSeccion } from '../../core/encabezado-seccion';
import { supabase } from '../../core/services/supabase.config';

@Component({
  standalone: true,
  imports: [FormsModule, EncabezadoSeccion],
  template: `
    <app-encabezado-seccion titulo="Registrar cliente" /><main aria-label="Registrar cliente">
      <form #form="ngForm" (ngSubmit)="form.valid && guardar()">
        <label>Nombre comercial <input required name="nombre" [(ngModel)]="nombre"></label>
        <label>Teléfono <input required type="tel" pattern="[0-9]{10}" name="telefono" [(ngModel)]="telefono"></label>
        <label>Dirección <input required name="direccion" [(ngModel)]="direccion"></label>
        <label>Observaciones <textarea name="notas" [(ngModel)]="notas"></textarea></label>
        <label>Correo de la cuenta del portal (opcional)
          <input type="email" email name="correo" [(ngModel)]="correo">
        </label>
        <small>Vincula la cuenta para habilitar crédito en sus pedidos.</small>
        <button [disabled]="form.invalid || ocupado()">Registrar cliente</button>
      </form>
      <p role="status">{{ mensaje() }}</p>
    </main>`,
  styleUrl: './clientes.css'
})
export class Clientes {
  nombre = '';
  telefono = '';
  direccion = '';
  notas = '';
  correo = '';
  ocupado = signal(false);
  mensaje = signal('');

  async guardar() {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    try {
      const {error} = await supabase.rpc('registrar_cliente_comercial', {
        p_nombre: this.nombre, p_telefono: this.telefono, p_direccion: this.direccion,
        p_observaciones: this.notas, p_correo: this.correo
      });
      if (error) throw error;
      this.nombre = this.telefono = this.direccion = this.notas = this.correo = '';
      this.mensaje.set('Cliente registrado.');
    } catch (error) {
      this.mensaje.set((error as {message?: string}).message || 'No fue posible registrar al cliente.');
    } finally {
      this.ocupado.set(false);
    }
  }
}

