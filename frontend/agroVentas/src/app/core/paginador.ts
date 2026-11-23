import { Component, computed, input, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-paginador',
  template: `@if (paginas() > 1) {
    <nav aria-label="Paginación">
      <button type="button" [disabled]="actual() === 1" (click)="pagina.set(actual()-1)">Anterior</button>
      <span aria-live="polite">Página {{ actual() }} de {{ paginas() }}</span>
      <button type="button" [disabled]="actual() === paginas()" (click)="pagina.set(actual()+1)">Siguiente</button>
    </nav>
  }`,
  styles: [`nav {display:flex;gap:1rem;justify-content:center;align-items:center;margin:1rem 0;color:#174b32} button {font:inherit;padding:.5rem .8rem;border:1px solid #abc1a0;border-radius:.6rem;background:#fffdf5;color:#176b43;cursor:pointer} button:disabled {opacity:.5}`]
})
export class Paginador {
  total = input.required<number>();
  filtros = input.required<string>();
  readonly tamano = 10;
  pagina = linkedSignal({source: this.filtros, computation: () => 1});
  paginas = computed(() => Math.max(1, Math.ceil(this.total()/this.tamano)));
  actual = computed(() => Math.min(this.pagina(), this.paginas()));
  inicio = computed(() => (this.actual()-1)*this.tamano);
}
