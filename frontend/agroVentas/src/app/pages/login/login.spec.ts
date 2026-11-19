import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      // No se conecta a Supabase: el servicio de autenticación se simula.
      providers: [provideRouter([]), { provide: AuthService, useValue: {} }]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('tiene un solo título de página y cada campo con su etiqueta', () => {
    const html: HTMLElement = fixture.nativeElement;
    expect(Array.from(html.querySelectorAll('h1')).map(h => h.textContent?.trim())).toEqual(['Iniciar sesión']);
    for (const id of ['email', 'password']) {
      expect(html.querySelector(`label[for="${id}"]`)).not.toBeNull();
    }
  });

  it('enlaza a recuperar contraseña y a crear cuenta', () => {
    const destinos = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'))
      .map(enlace => enlace.getAttribute('href'));
    expect(destinos).toEqual(['/recuperar-contrasena', '/register']);
  });
});
