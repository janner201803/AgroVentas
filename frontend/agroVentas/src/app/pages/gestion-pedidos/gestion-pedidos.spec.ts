import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { PedidoGestion, PedidoService } from '../../core/services/pedido.service';
import { calcularUrgencia, normalizarEstado } from '../../core/estados-pedido';
import { GestionPedidos, coincideEstado } from './gestion-pedidos';

// HU-12 / HU-13: pruebas del componente con el servicio simulado (sin backend ni Supabase).
const AHORA = { dia: '2026-11-19', hora: '10:30', manana: '2026-11-20' };

function pedido(id: string, estado: string, fecha: string, hora: string, extra: Partial<PedidoGestion> = {}): PedidoGestion {
  return {
    id, estado, fecha_entrega: fecha, hora_entrega: `${hora}:00`,
    id_producto: 1, producto_nombre: 'Piña pepa', producto_unidad: 'kg', cantidad: 2, valor: 10000,
    metodo_pago: 'efectivo', id_usuario: 'c1', cliente_nombre: 'Ana Pérez', cliente_correo: 'ana@prueba.co',
    cliente_celular: '3001234567', ultimo_cambio_en: null, ultimo_cambio_por: null, ...extra
  };
}

describe('estados y urgencia (HU-13)', () => {
  it('normaliza los estados antiguos', () => {
    expect(normalizarEstado('Preparado ')).toBe('en_preparacion');
    expect(normalizarEstado('confirmado')).toBe('en_preparacion');
    expect(normalizarEstado('rechazado')).toBe('cancelado');
    expect(normalizarEstado('en ruta')).toBeNull();
  });

  it('marca atrasado, hoy y mañana solo en pedidos por atender', () => {
    expect(calcularUrgencia('pendiente', '2026-11-18', '15:00', AHORA)).toBe('atrasado');
    expect(calcularUrgencia('pendiente', '2026-11-19', '09:00', AHORA)).toBe('atrasado');
    expect(calcularUrgencia('en_preparacion', '2026-11-19', '14:00', AHORA)).toBe('hoy');
    expect(calcularUrgencia('pendiente', '2026-11-20', '08:00', AHORA)).toBe('manana');
    expect(calcularUrgencia('pendiente', '2026-11-25', '08:00', AHORA)).toBeNull();
    expect(calcularUrgencia('entregado', '2026-11-18', '08:00', AHORA)).toBeNull();
    expect(calcularUrgencia('cancelado', '2026-11-19', '14:00', AHORA)).toBeNull();
  });

  it('"Por atender" agrupa pendiente y en preparación', () => {
    expect(coincideEstado('pendiente', 'por_atender')).toBe(true);
    expect(coincideEstado('en_preparacion', 'por_atender')).toBe(true);
    expect(coincideEstado('entregado', 'por_atender')).toBe(false);
    expect(coincideEstado(null, 'todos')).toBe(true);
  });
});

describe('GestionPedidos', () => {
  let fixture: ComponentFixture<GestionPedidos>;
  let component: GestionPedidos;
  let lista: PedidoGestion[];
  let cambios: { id: string; estado: string }[];
  let fallarCambio: boolean;

  beforeEach(async () => {
    lista = [
      pedido('lejano', 'pendiente', '2026-11-25', '08'),
      pedido('hoy', 'en_preparacion', '2026-11-19', '14', { cliente_nombre: 'Luis Gómez', cliente_celular: '3110000000' }),
      pedido('atrasado', 'pendiente', '2026-11-18', '15'),
      pedido('entregado', 'entregado', '2026-11-17', '09'),
      pedido('cancelado', 'cancelado', '2026-11-16', '09')
    ];
    cambios = [];
    fallarCambio = false;

    await TestBed.configureTestingModule({
      imports: [GestionPedidos],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            usuario: () => ({ id: 'e1', email: 'empleado@prueba.co' }),
            etiquetaRol: () => 'PANEL DE EMPLEADO',
            cerrarSesion: async () => undefined
          }
        },
        {
          provide: PedidoService,
          useValue: {
            listarGestion: () => of(lista),
            historialEstados: () => of([
              { id: 1, estado_anterior: null, estado_nuevo: 'pendiente', nota: 'Pedido registrado', creado_en: '2026-11-18T13:00:00Z', responsable: 'Ana Pérez' }
            ]),
            cambiarEstado: (id: string, estado: string) => {
              cambios.push({ id, estado });
              if (fallarCambio) return throwError(() => ({ status: 409, error: { mensaje: 'No se puede pasar un pedido de "entregado" a "pendiente"' } }));
              return of({ ...lista.find(p => p.id === id)!, estado });
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GestionPedidos);
    component = fixture.componentInstance;
    component.ahora.set(AHORA);
    fixture.detectChanges();
    await fixture.whenStable();
    component.ahora.set(AHORA); // la consulta renueva "ahora"; se fija para que la prueba sea estable
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fixture.destroy();
  });

  const html = () => fixture.nativeElement as HTMLElement;

  it('por defecto lista los pedidos por atender ordenados por entrega', () => {
    expect(component.pedidosFiltrados().map(p => p.id)).toEqual(['atrasado', 'hoy', 'lejano']);
    expect(html().querySelectorAll('article.pedido-gestion').length).toBe(3);
  });

  it('resume urgentes, pendientes y en preparación', () => {
    expect(component.resumen()).toEqual({ urgentes: 2, atrasados: 1, pendientes: 2, enPreparacion: 1, manana: 0 });
  });

  it('destaca los pedidos urgentes en pantalla', () => {
    const atrasado = html().querySelector('h3[title="atrasado"]')?.closest('article');
    const entregaHoy = html().querySelector('h3[title="hoy"]')?.closest('article');

    expect(atrasado?.textContent ?? '').toContain('Atrasado');
    expect(entregaHoy?.textContent ?? '').toContain('Entrega hoy');
  });

  it('filtra por cliente, por fecha y solo urgentes', () => {
    component.busquedaCliente.set('gomez');
    expect(component.pedidosFiltrados().map(p => p.id)).toEqual(['hoy']);
    component.busquedaCliente.set('');

    component.desde.set('2026-11-19');
    expect(component.pedidosFiltrados().map(p => p.id)).toEqual(['hoy', 'lejano']);
    component.limpiarFiltros();

    component.verUrgentes();
    expect(component.pedidosFiltrados().map(p => p.id)).toEqual(['atrasado', 'hoy']);
  });

  it('los cerrados se muestran del más reciente al más antiguo', () => {
    component.filtroEstado.set('todos');
    expect(component.pedidosFiltrados().map(p => p.id)).toEqual(['lejano', 'hoy', 'atrasado', 'entregado', 'cancelado']);
  });

  it('ofrece solo las transiciones permitidas', () => {
    const [atrasado, hoy] = component.pedidosFiltrados();
    expect(component.transiciones(atrasado)).toEqual(['en_preparacion', 'cancelado']);
    expect(component.transiciones(hoy)).toEqual(['pendiente', 'entregado', 'cancelado']);
    component.filtroEstado.set('entregado');
    expect(component.transiciones(component.pedidosFiltrados()[0])).toEqual([]);
  });

  it('pasa un pedido a preparación y actualiza la lista', () => {
    const atrasado = component.pedidosFiltrados()[0];
    component.cambiarEstado(atrasado, 'en_preparacion');
    expect(cambios).toEqual([{ id: 'atrasado', estado: 'en_preparacion' }]);
    expect(component.pedidos().find(p => p.id === 'atrasado')!.estado).toBe('en_preparacion');
    expect(component.mensaje()).toContain('En preparación');
  });

  it('pide confirmación para entregar o cancelar y no cambia si se cancela', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const hoy = component.pedidosFiltrados()[1];
    component.cambiarEstado(hoy, 'entregado');
    component.cambiarEstado(hoy, 'cancelado');
    expect(cambios).toEqual([]);
  });

  it('muestra el error del servidor si la transición es rechazada', () => {
    fallarCambio = true;
    component.cambiarEstado(component.pedidosFiltrados()[0], 'en_preparacion');
    expect(component.error()).toContain('No se puede pasar');
    expect(component.pedidos().find(p => p.id === 'atrasado')!.estado).toBe('pendiente');
  });

  it('abre el historial con fecha, responsable y nota', async () => {
    component.alternarHistorial(component.pedidosFiltrados()[0]);
    fixture.detectChanges();
    const historial = html().querySelector('.historial')?.textContent ?? '';
    expect(historial).toContain('Pendiente');
    expect(historial).toContain('Ana Pérez');
    expect(historial).toContain('Pedido registrado');
  });
});
