import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { CambioUsuario, UsuarioService, UsuarioSistema } from '../../core/services/usuario.service';
import { Usuarios, coincideFiltro, normalizar } from './usuarios';

// HU-21: pruebas del componente con el servicio simulado (sin backend ni Supabase).
const ID_PROPIO = 'u-duenio';

function cuenta(id: string, rol: UsuarioSistema['rol'], extra: Partial<UsuarioSistema> = {}): UsuarioSistema {
  return { id, rol, activo: true, correo: `${id}@prueba.co`, nombre: null, celular: null, ...extra };
}

describe('Usuarios', () => {
  let fixture: ComponentFixture<Usuarios>;
  let component: Usuarios;
  let lista: UsuarioSistema[];
  let llamadas: { id: string; cambios: CambioUsuario }[];
  let fallar: boolean;

  beforeEach(async () => {
    lista = [
      cuenta('u-cliente', 'cliente', { nombre: 'Ana Pérez', celular: '3001234567' }),
      cuenta(ID_PROPIO, 'propietario'),
      cuenta('u-empleado', 'empleado'),
      cuenta('u-inactivo', 'cliente', { activo: false })
    ];
    llamadas = [];
    fallar = false;

    await TestBed.configureTestingModule({
      imports: [Usuarios],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { usuario: () => ({ id: ID_PROPIO }), cerrarSesion: async () => undefined } },
        {
          provide: UsuarioService,
          useValue: {
            listar: () => of(lista),
            actualizar: (id: string, cambios: CambioUsuario) => {
              llamadas.push({ id, cambios });
              if (fallar) return throwError(() => ({ status: 409, error: { mensaje: 'No permitido' } }));
              return of({ ...lista.find(u => u.id === id)!, ...cambios });
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Usuarios);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  const html = () => fixture.nativeElement as HTMLElement;

  it('lista las cuentas ordenadas por rol: Propietario, Empleado y Cliente', () => {
    expect(component.usuariosFiltrados().map(u => u.id))
      .toEqual([ID_PROPIO, 'u-empleado', 'u-cliente', 'u-inactivo']);
    expect(html().querySelectorAll('article.usuario').length).toBe(4);
  });

  it('cuenta y filtra por rol e inactivos', () => {
    expect(component.contadores()).toEqual({ todos: 4, propietario: 1, empleado: 1, cliente: 2, inactivos: 1 });
    component.filtro.set('inactivos');
    expect(component.usuariosFiltrados().map(u => u.id)).toEqual(['u-inactivo']);
  });

  it('busca por nombre sin tildes y por celular', () => {
    component.busqueda.set('perez');
    expect(component.usuariosFiltrados().map(u => u.id)).toEqual(['u-cliente']);
    component.busqueda.set('300123');
    expect(component.usuariosFiltrados().map(u => u.id)).toEqual(['u-cliente']);
  });

  it('bloquea los controles de la cuenta propia', () => {
    fixture.detectChanges();
    const propia = html().querySelector('article.usuario')!;
    expect(propia.textContent).toContain('Tú');
    expect(propia.querySelector('select')!.disabled).toBe(true);
    expect(propia.querySelector('button')!.disabled).toBe(true);
  });

  it('cambia un Cliente a Empleado y actualiza la lista', () => {
    const selector = { value: 'empleado' };
    component.cambiarRol(lista[0], selector);
    expect(llamadas).toEqual([{ id: 'u-cliente', cambios: { rol: 'empleado' } }]);
    expect(component.usuarios().find(u => u.id === 'u-cliente')!.rol).toBe('empleado');
    expect(component.mensaje()).toContain('Empleado');
  });

  it('pide confirmación para nombrar otro Propietario y no guarda si se cancela', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const selector = { value: 'propietario' };
    component.cambiarRol(lista[2], selector);
    expect(llamadas).toEqual([]);
    expect(selector.value).toBe('empleado');
  });

  it('si el servidor rechaza el cambio, muestra el error y devuelve el selector', () => {
    fallar = true;
    const selector = { value: 'cliente' };
    component.cambiarRol(lista[2], selector);
    expect(component.error()).toBe('No permitido');
    expect(selector.value).toBe('empleado');
    expect(component.usuarios().find(u => u.id === 'u-empleado')!.rol).toBe('empleado');
  });

  it('desactiva una cuenta tras confirmar y la reactiva sin pedir confirmación', () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.alternarActivo(lista[2]);
    expect(llamadas[0]).toEqual({ id: 'u-empleado', cambios: { activo: false } });
    expect(confirmar).toHaveBeenCalledTimes(1);

    component.alternarActivo(lista[3]);
    expect(llamadas[1]).toEqual({ id: 'u-inactivo', cambios: { activo: true } });
    expect(confirmar).toHaveBeenCalledTimes(1);
  });
});

describe('funciones de apoyo de Usuarios', () => {
  it('coincideFiltro separa inactivos de los roles', () => {
    const inactivo = cuenta('x', 'empleado', { activo: false });
    expect(coincideFiltro(inactivo, 'empleado')).toBe(true);
    expect(coincideFiltro(inactivo, 'inactivos')).toBe(true);
    expect(coincideFiltro(inactivo, 'cliente')).toBe(false);
  });

  it('normalizar tolera valores vacíos', () => {
    expect(normalizar(null)).toBe('');
    expect(normalizar('  José ')).toBe('jose');
  });
});
