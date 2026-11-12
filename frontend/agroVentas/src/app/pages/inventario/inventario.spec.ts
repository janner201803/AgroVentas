import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InventarioService, ProductoInventario, ResumenInventario, combinarFila } from '../../core/services/inventario.service';
import { Inventario, normalizarTexto } from './inventario';

function fila(id_producto: number, nombre: string, cantidad = 1, und: 'kg' | 'und' = 'und'): ProductoInventario {
  return { id: id_producto, id_producto, nombre, cantidad, precio: 1000, und };
}

const datos: ProductoInventario[] = [
  fila(3, 'Piña segunda', 40, 'kg'),
  fila(1, 'Mango', 12),
  fila(2, 'Piña huevo', 25),
  fila(4, 'Aguacate', 0),
];

describe('Inventario', () => {
  let component: Inventario;
  let fixture: ComponentFixture<Inventario>;
  let resumen: ResumenInventario;

  beforeEach(async () => {
    resumen = { migracionPendiente: false, productos: datos };
    await TestBed.configureTestingModule({
      imports: [Inventario],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { usuario: () => null, esAdministrador: () => false } },
        { provide: InventarioService, useValue: { listar: () => of(resumen), listarCatalogo: () => of([]) } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Inventario);
    component = fixture.componentInstance;
    component.productos = [...datos];
  });

  it('muestra todas las existencias ordenadas por nombre cuando no hay búsqueda', () => {
    expect(component.productosFiltrados.map(p => p.nombre))
      .toEqual(['Aguacate', 'Mango', 'Piña huevo', 'Piña segunda']);
  });

  it('busca sin distinguir mayúsculas ni tildes', () => {
    component.busqueda = 'PINA';
    expect(component.productosFiltrados.map(p => p.nombre)).toEqual(['Piña huevo', 'Piña segunda']);
  });

  it('incluye productos con existencia cero en el resultado de la búsqueda', () => {
    component.busqueda = 'agua';
    expect(component.productosFiltrados.map(p => p.id_producto)).toEqual([4]);
  });

  it('devuelve una lista vacía si nada coincide y la restaura al limpiar', () => {
    component.busqueda = 'zanahoria';
    expect(component.productosFiltrados).toEqual([]);
    component.limpiarBusqueda();
    expect(component.productosFiltrados.length).toBe(4);
  });

  it('no altera el arreglo original al ordenar', () => {
    const antes = component.productos.map(p => p.id_producto);
    void component.productosFiltrados;
    expect(component.productos.map(p => p.id_producto)).toEqual(antes);
  });

  it('normaliza texto vacío o nulo sin fallar', () => {
    expect(normalizarTexto(null)).toBe('');
    expect(normalizarTexto('  Piña  ')).toBe('pina');
  });

  it('renderiza el buscador y filtra las tarjetas en pantalla', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const html: HTMLElement = fixture.nativeElement;
    expect(html.querySelector('#buscar-producto')).not.toBeNull();
    expect(html.querySelectorAll('article.producto').length).toBe(4);

    component.busqueda = 'piña';
    fixture.detectChanges();
    const nombres = Array.from(html.querySelectorAll('article.producto h3')).map(h => h.textContent?.trim());
    expect(nombres).toEqual(['Piña huevo', 'Piña segunda']);
    expect(html.querySelector('.contador')?.textContent).toContain('2 de 4');
    fixture.destroy();
  });

  it('muestra disponible, comprometido, total y última actualización', async () => {
    resumen = {
      migracionPendiente: false,
      productos: [{ ...fila(1, 'Mango', 8), comprometido: 4, total: 12, actualizado_en: '2026-11-09T15:30:00' }]
    };
    fixture.detectChanges();
    await fixture.whenStable();
    const texto = (fixture.nativeElement as HTMLElement).querySelector('article.producto')?.textContent ?? '';
    expect(texto).toContain('Disponible');
    expect(texto).toMatch(/Comprometido en pedidos\s*4 und/);
    expect(texto).toMatch(/Total en bodega\s*12 und/);
    expect(texto).toContain('09/11/2026 15:30');
    fixture.destroy();
  });

  it('indica "Sin registro" cuando el producto no tiene fecha de actualización', async () => {
    resumen = { migracionPendiente: false, productos: [{ ...fila(1, 'Mango', 8), comprometido: 0, total: 8, actualizado_en: null }] };
    fixture.detectChanges();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sin registro');
    fixture.destroy();
  });

  it('si falta la migración, avisa y no muestra comprometido ni fecha', async () => {
    resumen = { migracionPendiente: true, productos: [{ ...fila(1, 'Mango', 8), comprometido: null, total: null, actualizado_en: null }] };
    fixture.detectChanges();
    await fixture.whenStable();
    const html: HTMLElement = fixture.nativeElement;
    expect(html.querySelector('.aviso-migracion')).not.toBeNull();
    expect(html.textContent).not.toContain('Comprometido en pedidos');
    expect(html.textContent).not.toContain('Última actualización');
    fixture.destroy();
  });

  it('muestra el botón "Volver a inicio" que lleva a /inicio', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const enlace = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a.volver');
    expect(enlace).not.toBeNull();
    expect(enlace!.textContent).toContain('Volver a inicio');
    expect(enlace!.getAttribute('href')).toBe('/inicio');
    fixture.destroy();
  });
});

describe('combinarFila', () => {
  const anterior: ProductoInventario = { ...fila(1, 'Mango', 8), comprometido: 4, total: 12, actualizado_en: '2026-11-09T15:30:00' };

  it('conserva el comprometido y recalcula el total al sumar existencias', () => {
    const resultado = combinarFila(anterior, fila(1, 'Mango', 18));
    expect(resultado.cantidad).toBe(18);
    expect(resultado.comprometido).toBe(4);
    expect(resultado.total).toBe(22);
    expect(resultado.actualizado_en).toBe('2026-11-09T15:30:00');
  });

  it('un producto nuevo queda sin comprometido conocido', () => {
    const resultado = combinarFila(undefined, fila(9, 'Limón', 5));
    expect(resultado.comprometido).toBeNull();
    expect(resultado.total).toBeNull();
  });
});
