import { Component, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EncabezadoSeccion } from '../../core/encabezado-seccion';
import { supabase } from '../../core/services/supabase.config';

interface LineaVenta { id_producto:number; nombre?:string; cantidad:number; unidad?:string; subtotal:number }
interface Venta { cliente_nombre:string | null; lineas:LineaVenta[]; id:number; pedido_id:string; total:number; metodo_pago:string; creado_en:string }
@Component({
  imports: [EncabezadoSeccion, FormsModule, CurrencyPipe, DatePipe],
  template: `<app-encabezado-seccion titulo="Ventas" /><main aria-label="Ventas">
    <form (ngSubmit)="consultar(1)">
      <label>Método de pago <select name="pago" [(ngModel)]="pago">
        <option value="">Todos</option><option value="efectivo">Efectivo</option>
        <option value="transferencia">Transferencia</option><option value="credito">Crédito</option>
      </select></label>
      <label>Desde <input type="date" name="desde" [(ngModel)]="desde"></label>
      <label>Hasta <input type="date" name="hasta" [(ngModel)]="hasta"></label>
      <button>Aplicar filtros</button>
    </form>
    @if (cargando()) { <p role="status">Cargando ventas…</p> }
    @else if (error()) { <p role="alert">{{ error() }}</p> }
    @else {
      @for (v of ventas(); track v.id) {
        <article>
          <header>
            <div><small>Cliente · Venta #{{ v.id }}</small><h2>{{ v.cliente_nombre || 'Cliente sin nombre registrado' }}</h2></div>
            <div class="importe"><small>Total de venta</small><strong>{{ v.total | currency:'COP':'symbol-narrow':'1.0-0' }}</strong></div>
          </header>
          <dl>
            <div><dt>Pedido</dt><dd>#{{ v.pedido_id }}</dd></div>
            <div><dt>Fecha de venta</dt><dd>{{ v.creado_en | date:'dd/MM/yyyy HH:mm':'-0500' }}</dd></div>
            <div><dt>Método de pago</dt><dd>{{ v.metodo_pago === 'credito' ? 'Crédito' : (v.metodo_pago === 'transferencia' ? 'Transferencia' : 'Efectivo') }}</dd></div>
          </dl>
          <details><summary>Productos ({{ v.lineas.length }})</summary>
            @for (linea of v.lineas; track linea.id_producto) {
              <p>{{ linea.nombre || 'Producto #' + linea.id_producto }} · {{ linea.cantidad }} {{ linea.unidad }}
                <strong>{{ linea.subtotal | currency:'COP':'symbol-narrow':'1.0-0' }}</strong></p>
            }
          </details>
        </article>
      } @empty { <p>No hay ventas con estos filtros.</p> }
      @if (paginas() > 1) { <nav aria-label="Paginación de ventas">
        <button [disabled]="pagina() === 1" (click)="consultar(pagina()-1, false)">Anterior</button>
        Página {{ pagina() }} de {{ paginas() }}
        <button [disabled]="pagina() >= paginas()" (click)="consultar(pagina()+1, false)">Siguiente</button>
      </nav> }
    }
  </main>`,
  styleUrls: ['../clientes/clientes.css','./ventas.css']
})
export class Ventas implements OnInit {
  pago = ''; desde = ''; hasta = '';
  private filtros = { pago:'', desde:'', hasta:'' };
  private consulta = 0;
  ventas = signal<Venta[]>([]);
  pagina = signal(1);
  paginas = signal(1);
  cargando = signal(false);
  error = signal('');
  ngOnInit() { void this.consultar(1); }

  async consultar(pagina:number, aplicar = true) {
    const turno = ++this.consulta;
    if (aplicar) this.filtros = { pago:this.pago, desde:this.desde, hasta:this.hasta };
    const {pago,desde,hasta} = this.filtros;
    this.error.set('');
    this.cargando.set(true);
    try {
      if (desde && hasta && desde > hasta) throw new Error('La fecha final debe ser igual o posterior a la inicial.');
      let query = supabase.from('ventas_detalle').select('id,pedido_id,total,metodo_pago,creado_en,cliente_nombre,lineas',{count:'exact'});
      if (pago) query = query.eq('metodo_pago',pago);
      if (desde) query = query.gte('creado_en', desde+'T00:00:00-05:00');
      if (hasta) {
        const siguiente = new Date(hasta+'T00:00:00-05:00');
        siguiente.setUTCDate(siguiente.getUTCDate()+1);
        query = query.lt('creado_en', siguiente.toISOString());
      }
      const inicio = (pagina-1)*10;
      const result = await query.order('creado_en',{ascending:false}).order('id',{ascending:false}).range(inicio,inicio+9);
      if (turno !== this.consulta) return;
      if (result.error) throw new Error('No fue posible consultar las ventas. Revisa la conexión y los permisos.');
      this.ventas.set(result.data ?? []);
      this.pagina.set(pagina);
      this.paginas.set(Math.max(1,Math.ceil((result.count ?? 0)/10)));
    } catch (e) {
      if (turno === this.consulta) this.error.set(e instanceof Error ? e.message : 'Error al consultar ventas.');
    } finally { if (turno === this.consulta) this.cargando.set(false); }
  }
}


