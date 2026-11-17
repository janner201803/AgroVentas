import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { AuthService, Rol } from '../services/auth.service';
import { rolGuard } from './rol.guard';

// HU-01: el guard decide solo con el rol del perfil, no con el correo.
describe('rolGuard', () => {
  let usuario: { id: string; email?: string } | null;
  let rol: Rol | null;
  let activo: boolean;

  beforeEach(() => {
    usuario = { id: 'u1', email: 'persona@prueba.co' };
    rol = 'cliente';
    activo = true;
    TestBed.configureTestingModule({
      providers: [{
        provide: AuthService,
        useValue: {
          esperarUsuario: async () => usuario,
          tieneRol: (...roles: Rol[]) => activo && rol !== null && roles.includes(rol)
        }
      }]
    });
  });

  const ejecutar = (...roles: Rol[]) => TestBed.runInInjectionContext(() =>
    rolGuard(...roles)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
  ) as Promise<boolean | UrlTree>;

  const destino = (resultado: boolean | UrlTree) =>
    resultado instanceof UrlTree ? TestBed.inject(Router).serializeUrl(resultado) : resultado;

  it('deja pasar al Propietario a una ruta de Propietario', async () => {
    rol = 'propietario';
    expect(destino(await ejecutar('propietario'))).toBe(true);
  });

  it('envía al Empleado y al Cliente a /inicio si la ruta es solo del Propietario', async () => {
    for (const otro of ['empleado', 'cliente'] as Rol[]) {
      rol = otro;
      expect(destino(await ejecutar('propietario'))).toBe('/inicio');
    }
  });

  it('acepta cualquiera de varios roles', async () => {
    rol = 'empleado';
    expect(destino(await ejecutar('propietario', 'empleado'))).toBe(true);
  });

  it('sin sesión envía a /login', async () => {
    usuario = null;
    expect(destino(await ejecutar('propietario'))).toBe('/login');
  });

  it('sin perfil (migración pendiente) no deja pasar', async () => {
    rol = null;
    expect(destino(await ejecutar('propietario'))).toBe('/inicio');
  });
});
