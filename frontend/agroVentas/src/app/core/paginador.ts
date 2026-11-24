import { Component, computed, input, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-paginador',
  template: `@if (total() > 0) {
    <div class="pie-paginacion">
      <span class="resumen-paginacion" aria-live="polite">Mostrando {{ desde() }}–{{ hasta() }} de {{ total() }} resultados</span>
      <nav class="controles-paginacion" aria-label="Paginación">
        <button type="button" aria-label="Página anterior" [disabled]="actual() === 1" (click)="pagina.set(actual()-1)">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <span class="pagina-actual" aria-current="page">{{ actual() }}</span>
        <button type="button" aria-label="Página siguiente" [disabled]="actual() === paginas()" (click)="pagina.set(actual()+1)">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </nav>
    </div>
  }`,
  styles: [`
    :host { display:block; }
    .pie-paginacion { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:14px; margin-top:8px; color:#176b43; font:14px Arial,sans-serif; }
    .controles-paginacion { display:flex; align-items:center; gap:10px; }
    .controles-paginacion button,.pagina-actual { display:grid; place-items:center; width:42px; height:42px; border:1px solid #d9dfb1; border-radius:50%; }
    .controles-paginacion button { color:#55725c; background:#f7f8e8; cursor:pointer; transition:background .2s ease,color .2s ease; }
    .controles-paginacion button:hover:not(:disabled) { color:#fff; background:#176b43; }
    .controles-paginacion button:disabled { opacity:.5; cursor:not-allowed; }
    .pagina-actual { border-color:#176b43; color:#fff9e8; background:#176b43; font-weight:800; }
    @media(max-width:560px) { .pie-paginacion { align-items:flex-start; } }
  `]
})
export class Paginador {
  total = input.required<number>();
  filtros = input.required<string>();
  tamano = input(10);
  pagina = linkedSignal({ source: this.filtros, computation: () => 1 });
  paginas = computed(() => Math.max(1, Math.ceil(this.total() / this.tamano())));
  actual = computed(() => Math.min(this.pagina(), this.paginas()));
  inicio = computed(() => (this.actual() - 1) * this.tamano());
  desde = computed(() => this.total() > 0 ? this.inicio() + 1 : 0);
  hasta = computed(() => Math.min(this.actual() * this.tamano(), this.total()));
}
