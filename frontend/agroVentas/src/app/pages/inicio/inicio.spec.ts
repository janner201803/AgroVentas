import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { PedidoService, ProductoPedido } from '../../core/services/pedido.service';
import { Inicio } from './inicio';

/** Lista de precios (DESIGN.md, paso 3). No se conecta al backend ni a Supabase. */
describe('Inicio (lista de precios)', () => {
  let fixture: ComponentFixture<Inicio>;

  const variedades: ProductoPedido[] = [
    { id: 1, nombre: 'Piña pepa', cantidad: 120.5, precio: 5000, und: 'kg' },
    { id: 2, nombre: 'Piña tercera', cantidad: 0, precio: 2500, und: 'und' }
  ];

  async function crear(respuesta: Observable<ProductoPedido[]>): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { usuario: () => null, esAdministrador: () => false } },
        { provide: PedidoService, useValue: { obtenerProductos: () => respuesta } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra una fila por variedad con su unidad', async () => {
    const html = await crear(of(variedades));
    const filas = html.querySelectorAll('tbody tr');
    expect(filas.length).toBe(2);
    expect(filas[0].textContent).toContain('Piña pepa');
    expect(filas[0].textContent).toContain('por kg');
    expect(filas[1].textContent).toContain('por unidad');
    expect(html.querySelectorAll('h1').length).toBe(1);
  });

  it('"Pedir" lleva a /pedidos con la variedad elegida', async () => {
    const html = await crear(of(variedades));
    const enlace = html.querySelector<HTMLAnchorElement>('tbody tr a');
    expect(enlace?.getAttribute('href')).toBe('/pedidos?producto=1');
    expect(enlace?.getAttribute('aria-label')).toBe('Pedir Piña pepa');
  });

  it('marca como agotada la variedad sin existencias y no ofrece pedirla', async () => {
    const html = await crear(of(variedades));
    const fila = html.querySelectorAll('tbody tr')[1];
    expect(fila.textContent).toContain('Agotada');
    expect(fila.querySelector('a')).toBeNull();
  });

  it('avisa si no se pudo cargar y permite reintentar', async () => {
    const html = await crear(throwError(() => new Error('sin conexión')));
    expect(html.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar la lista de precios');
    expect(html.querySelector('[role="alert"] button')?.textContent).toContain('Reintentar');
    expect(html.querySelector('table')).toBeNull();
  });
});
