import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { MisPedidos } from './mis-pedidos';
import { PedidoHistorial, PedidoService } from '../../core/services/pedido.service';

/** Pruebas de HU-08 (Consultar estado de pedidos). No se conectan al backend ni a Supabase. */
describe('MisPedidos (HU-08)', () => {
  let fixture: ComponentFixture<MisPedidos>;
  let component: MisPedidos;
  let respuestas: Observable<PedidoHistorial[]>[];
  let llamadas: number;

  const pedido = (cambios: Partial<PedidoHistorial> = {}): PedidoHistorial => ({
    id: 'p-1',
    id_producto: 1,
    producto_nombre: 'Piña pepa',
    producto_unidad: 'kg',
    cantidad: 3.5,
    valor: 17500,
    estado: 'pendiente',
    metodo_pago: 'efectivo',
    fecha_entrega: '2026-11-13',
    hora_entrega: '09:00:00',
    ...cambios
  });

  /** Crea la pantalla; cada llamada a listarPedidos() consume la siguiente respuesta simulada. */
  async function crear(...simuladas: Observable<PedidoHistorial[]>[]): Promise<void> {
    respuestas = simuladas;
    llamadas = 0;
    const servicioSimulado: Pick<PedidoService, 'listarPedidos'> = {
      listarPedidos: () => respuestas[Math.min(llamadas++, respuestas.length - 1)]
    };

    await TestBed.configureTestingModule({
      imports: [MisPedidos],
      providers: [provideRouter([]), { provide: PedidoService, useValue: servicioSimulado }]
    }).compileComponents();

    fixture = TestBed.createComponent(MisPedidos);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  /** Pulsa un botón por su texto, como lo haría el cliente, y espera a que la vista se actualice. */
  async function pulsar(textoBoton: string): Promise<void> {
    const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const boton = botones.find(item => item.textContent?.includes(textoBoton));
    if (!boton) throw new Error(`No se encontró el botón "${textoBoton}"`);
    boton.click();
    await fixture.whenStable();
  }

  const texto = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const tarjetas = (): NodeListOf<Element> => (fixture.nativeElement as HTMLElement).querySelectorAll('.pedido-card');

  it('muestra cada pedido con producto, cantidad, entrega, valor y estado', async () => {
    await crear(of([pedido({ estado: 'confirmado' })]));

    expect(tarjetas().length).toBe(1);
    const tarjeta = tarjetas()[0].textContent ?? '';
    expect(tarjeta).toContain('Piña pepa');
    expect(tarjeta).toContain('3.5 kg');
    expect(tarjeta).toContain('13 de noviembre de 2026');
    expect(tarjeta).toContain('09:00');
    // La app aún no registra la configuración regional es-CO: el separador de miles puede ser coma o punto.
    expect(tarjeta).toMatch(/17[.,]500/);
    expect(tarjeta).toContain('Confirmado');
    expect(tarjeta).toContain('Efectivo');
  });

  it('avisa cuando el cliente todavía no tiene pedidos', async () => {
    await crear(of([]));

    expect(tarjetas().length).toBe(0);
    expect(texto()).toContain('Aún no tienes pedidos');
    expect(texto()).toContain('0 pedidos');
  });

  it('filtra por grupo de estado y cuenta los pedidos de cada grupo', async () => {
    await crear(of([
      pedido({ id: 'a', estado: 'pendiente' }),
      pedido({ id: 'b', estado: 'Preparado ' }),
      pedido({ id: 'c', estado: 'entregado' }),
      pedido({ id: 'd', estado: 'cancelado' }),
      pedido({ id: 'e', estado: 'rechazado' })
    ]));

    expect(component.contar('todos')).toBe(5);
    expect(component.contar('activos')).toBe(2);
    expect(component.contar('entregados')).toBe(1);
    expect(component.contar('cancelados')).toBe(2);

    await pulsar('Cancelados');

    expect(component.pedidosFiltrados.map(item => item.id)).toEqual(['d', 'e']);
    expect(tarjetas().length).toBe(2);
  });

  it('informa cuando ningún pedido coincide con el filtro elegido', async () => {
    await crear(of([pedido({ estado: 'pendiente' })]));

    await pulsar('Entregados');

    expect(tarjetas().length).toBe(0);
    expect(texto()).toContain('No tienes pedidos en este estado');
  });

  it('muestra un estado desconocido tal como llega y solo dentro de "Todos"', async () => {
    await crear(of([pedido({ estado: 'en ruta' })]));

    expect(component.etiquetaEstado('en ruta')).toBe('en ruta');
    expect(component.etiquetaEstado('')).toBe('Sin estado');
    expect(component.contar('todos')).toBe(1);
    expect(component.contar('activos') + component.contar('entregados') + component.contar('cancelados')).toBe(0);
  });

  it('muestra el mensaje del servidor si la consulta falla y permite reintentar', async () => {
    await crear(
      throwError(() => ({ status: 500, error: { mensaje: 'Error al consultar los pedidos' } })),
      of([pedido()])
    );

    expect(texto()).toContain('Error al consultar los pedidos');
    expect(tarjetas().length).toBe(0);

    await pulsar('Intentar de nuevo');

    expect(llamadas).toBe(2);
    expect(component.error).toBe('');
    expect(tarjetas().length).toBe(1);
  });

  it('explica el fallo de conexión cuando el backend no responde', async () => {
    await crear(throwError(() => ({ status: 0 })));

    expect(texto()).toContain('No se pudo conectar con el servidor');
  });

  it('vuelve a consultar al pulsar "Actualizar" y refleja el estado nuevo', async () => {
    await crear(of([pedido({ estado: 'pendiente' })]), of([pedido({ estado: 'entregado' })]));
    expect(tarjetas()[0].textContent).toContain('Pendiente');

    await pulsar('Actualizar');

    expect(llamadas).toBe(2);
    expect(tarjetas()[0].textContent).toContain('Entregado');
    expect(component.ultimaConsulta).not.toBeNull();
  });
});
