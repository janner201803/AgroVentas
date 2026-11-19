import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { Register } from './register';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      // No se conecta a Supabase: el servicio de autenticación se simula.
      providers: [provideRouter([]), { provide: AuthService, useValue: {} }]
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('tiene un solo título de página y cada campo con su etiqueta', () => {
    const html: HTMLElement = fixture.nativeElement;
    expect(Array.from(html.querySelectorAll('h1')).map(h => h.textContent?.trim())).toEqual(['Crear cuenta']);
    for (const id of ['nombre', 'celular', 'email', 'password', 'confirmarPassword']) {
      expect(html.querySelector(`label[for="${id}"]`)).not.toBeNull();
    }
  });
});
