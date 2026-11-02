import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InventarioService } from '../../core/services/inventario.service';
import { Inventario } from './inventario';

describe('Inventario', () => {
  let component: Inventario;
  let fixture: ComponentFixture<Inventario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Inventario],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { usuario: () => null } },
        { provide: InventarioService, useValue: {} },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Inventario);
    component = fixture.componentInstance;
  });

  it('uses kilograms for pepa, primera, and segunda pineapples', () => {
    expect(component.unidadSugerida('Piña pepa')).toBe('kg');
    expect(component.unidadSugerida('piña primera')).toBe('kg');
    expect(component.unidadSugerida('PIÑA SEGUNDA')).toBe('kg');
  });

  it('uses individual units for the smaller pineapple varieties', () => {
    for (const variedad of ['tercera', 'cuarta', 'quinta', 'delgada', 'huevo']) {
      expect(component.unidadSugerida(`Piña ${variedad}`)).toBe('und');
    }
  });

  it('does not impose a unit on other products', () => {
    expect(component.unidadSugerida('Mango')).toBeNull();
  });
});
