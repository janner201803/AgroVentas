import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { InventarioService } from '../../core/services/inventario.service';
import { PedidoHistorial, PedidoService } from '../../core/services/pedido.service';
import { Pedidos } from './pedidos';

function pedido(id: string, estado: string, extra: Partial<PedidoHistorial> = {}): PedidoHistorial {
  return {
    id, id_producto: 1, producto_nombre: 'Piña segunda', producto_unidad: 'kg',
    cantidad: 12.5, valor: 50000, estado, metodo_pago: 'efectivo',
    fecha_entrega: '2026-11-20', hora_entrega: '10:00:00', ...extra
  };
}

describe('Pedidos', () => {
  let component: Pedidos;
  let fixture: ComponentFixture<Pedidos>;
  let respuestaPedidos: () => Observable<PedidoHistorial[]>;
  let consultas: number;

  async function crear(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(Pedidos);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    consultas = 0;
    respuestaPedidos = () => of([pedido('8f2c1a4e-1111-4000-8000-000000000000', 'pendiente')]);
    // Las pruebas del historial (botón Actualizar, número corto, errores) pasaron a mis-pedidos.spec.ts.
    await TestBed.configureTestingModule({
      imports: [Pedidos],
      providers: [
        provideRouter([]),
        {
          provide: PedidoService,
          useValue: {
            obtenerProductos: () => of([]),
            obtenerHorarios: () => of([]),
            listarPedidos: () => { consultas++; return respuestaPedidos(); },
            crearPedido: () => of({}),
            invalidarProductos: () => {}
          }
        },
        { provide: InventarioService, useValue: { invalidarInventario: () => {} } }
      ]
    }).compileComponents();
  });

  afterEach(() => fixture?.destroy());

  it('se crea', async () => {
    await crear();
    expect(component).toBeTruthy();
  });

  it('no consulta el historial: la consulta está en /mis-pedidos (HU-08)', async () => {
    await crear();
    expect(consultas).toBe(0);
  });

  it('calcula el valor estimado del producto seleccionado', async () => {
    await crear();
    component.productos = [
      { id: 1, nombre: 'Primera', und: 'kg', precio: 2000, cantidad: 5 }
    ];
    component.productoId = 1;
    component.cantidad = 1.5;

    expect(component.valorEstimado).toBe(3000);
    component.cantidad = null;
    expect(component.valorEstimado).toBe(0);
  });

  it('envía dos variedades en un solo pedido y acumula un producto repetido', async () => {
    await crear();
    component.productos = [
      { id: 1, nombre: 'Primera', und: 'kg', precio: 2000, cantidad: 5 },
      { id: 2, nombre: 'Segunda', und: 'und', precio: 3000, cantidad: 6 }
    ];
    for (const [id, cantidad] of [[1, 1], [2, 2], [1, 0.5]]) {
      component.productoId = id;
      component.cantidad = cantidad;
      component.agregarProducto();
    }
    expect(component.totalCarrito).toBe(9000);
    component.horaEntrega = '09:00';
    const guardar = vi.spyOn(TestBed.inject(PedidoService), 'crearPedido');
    component.enviarPedido();
    expect(guardar).toHaveBeenCalledTimes(1);
    expect(guardar).toHaveBeenCalledWith(expect.objectContaining({
      lineas: [{ id_producto: 1, cantidad: 1.5 }, { id_producto: 2, cantidad: 2 }]
    }));
    expect(component.carrito).toHaveLength(0);
  });

  it('enlaza a la pantalla "Mis pedidos"', async () => {
    const html = await crear();
    const enlace = html.querySelector<HTMLAnchorElement>('section.historial a.enlace-mis-pedidos');
    expect(enlace?.getAttribute('href')).toBe('/mis-pedidos');
  });
});
