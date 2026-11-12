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

  it('enlaza a la pantalla "Mis pedidos"', async () => {
    const html = await crear();
    const enlace = html.querySelector<HTMLAnchorElement>('section.historial a.enlace-mis-pedidos');
    expect(enlace?.getAttribute('href')).toBe('/mis-pedidos');
  });
});
