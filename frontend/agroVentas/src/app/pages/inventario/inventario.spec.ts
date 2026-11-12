import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InventarioService, ProductoInventario } from '../../core/services/inventario.service';
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Inventario],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { usuario: () => null, esAdministrador: () => false } },
        { provide: InventarioService, useValue: { listar: () => of(datos), listarCatalogo: () => of([]) } },
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
});
