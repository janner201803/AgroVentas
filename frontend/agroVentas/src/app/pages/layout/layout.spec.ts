import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';

import { Layout } from './layout';

describe('Layout', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra en el menú principal un enlace a Inicio', () => {
    const html: HTMLElement = fixture.nativeElement;
    const enlace = html.querySelector('nav[aria-label="Menú principal"] a[href="/inicio"]');

    expect(enlace?.textContent?.trim()).toBe('Inicio');
  });
});
