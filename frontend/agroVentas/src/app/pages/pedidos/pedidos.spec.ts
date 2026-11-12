import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
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

  const textoHistorial = (html: HTMLElement) => html.querySelector('section.historial')?.textContent ?? '';
  const botonActualizar = (html: HTMLElement) => html.querySelector<HTMLButtonElement>('button.actualizar-pedidos')!;

  beforeEach(async () => {
    consultas = 0;
    respuestaPedidos = () => of([pedido('8f2c1a4e-1111-4000-8000-000000000000', 'pendiente')]);
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

  it('muestra el historial con número de pedido corto y estado', async () => {
    const html = await crear();
    const texto = textoHistorial(html);
    expect(texto).toContain('Pedido #8F2C1A4E');
    expect(texto).not.toContain('8f2c1a4e-1111');
    expect(texto).toContain('Pendiente');
    expect(texto).toContain('Piña segunda');
  });

  it('muestra un estado vacío útil cuando no hay pedidos', async () => {
    respuestaPedidos = () => of([]);
    const html = await crear();
    expect(textoHistorial(html)).toContain('Aún no tienes pedidos');
  });

  it('un error no se presenta como historial vacío', async () => {
    respuestaPedidos = () => throwError(() => ({ error: { mensaje: 'No fue posible consultar tus pedidos.' } }));
    const html = await crear();
    const texto = textoHistorial(html);
    expect(texto).toContain('No fue posible consultar tus pedidos.');
    expect(texto).not.toContain('Aún no tienes pedidos');
  });

  it('"Actualizar" trae el estado más reciente sin recargar la página', async () => {
    const html = await crear();
    expect(consultas).toBe(1);

    respuestaPedidos = () => of([pedido('8f2c1a4e-1111-4000-8000-000000000000', 'confirmado')]);
    botonActualizar(html).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(consultas).toBe(2);
    expect(textoHistorial(html)).toContain('Confirmado');
    expect(botonActualizar(html).disabled).toBe(false);
  });

  it('si "Actualizar" falla, muestra el error en vez de dejar la lista vacía', async () => {
    const html = await crear();
    respuestaPedidos = () => throwError(() => ({ status: 0 }));
    botonActualizar(html).click();
    await fixture.whenStable();
    fixture.detectChanges();

    const texto = textoHistorial(html);
    expect(texto).toContain('No fue posible actualizar tu historial de pedidos.');
    expect(texto).not.toContain('Aún no tienes pedidos');
  });

  it('no lanza una segunda consulta mientras una está en curso', async () => {
    await crear();
    component.actualizandoPedidos = true;
    component.actualizarPedidos();
    expect(consultas).toBe(1);
  });

  it('idCorto tolera valores vacíos', async () => {
    await crear();
    expect(component.idCorto(null)).toBe('');
    expect(component.idCorto(12345)).toBe('12345');
  });
});
