import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { InventarioService } from '../../core/services/inventario.service';
import { PedidoService, ProductoPedido } from '../../core/services/pedido.service';
import { Pedidos } from './pedidos';

/** "Pedir" en la lista de precios abre /pedidos?producto=ID con la variedad ya elegida. */
describe('Pedidos: variedad elegida desde la lista de precios', () => {
  const productos: ProductoPedido[] = [
    { id: 1, nombre: 'Piña pepa', cantidad: 80, precio: 5000, und: 'kg' },
    { id: 3, nombre: 'Piña tercera', cantidad: 40, precio: 2500, und: 'und' }
  ];

  async function crear(parametros: Record<string, string>): Promise<Pedidos> {
    await TestBed.configureTestingModule({
      imports: [Pedidos],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(parametros) } } },
        { provide: AuthService, useValue: { usuario: () => null, esAdministrador: () => false } },
        {
          provide: PedidoService,
          useValue: {
            obtenerProductos: () => of(productos),
            obtenerHorarios: () => of([]),
            invalidarProductos: () => {}
          }
        },
        { provide: InventarioService, useValue: { invalidarInventario: () => {} } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(Pedidos);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  it('preselecciona la variedad indicada', async () => {
    const pedidos = await crear({ producto: '3' });
    expect(pedidos.productoId).toBe(3);
    expect(pedidos.productoSeleccionado?.nombre).toBe('Piña tercera');
  });

  it('no selecciona nada si la variedad no está disponible o no se indica', async () => {
    expect((await crear({ producto: '99' })).productoId).toBeNull();
    TestBed.resetTestingModule();
    expect((await crear({})).productoId).toBeNull();
  });
});
