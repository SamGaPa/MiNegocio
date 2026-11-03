import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let servicio: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), AuthService] });
    servicio = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });

  it('inicia sesión con la API y conserva el token solo en memoria', async () => {
    const inicio = servicio.iniciarSesion('usuario@ejemplo.com', 'clave-segura');
    const solicitud = http.expectOne('http://localhost:3000/api/v1/auth/login');
    expect(solicitud.request.body).toEqual({ email: 'usuario@ejemplo.com', contrasena: 'clave-segura' });
    solicitud.flush({ token: 'jwt-prueba', usuario: { id: 'u-1', email: 'usuario@ejemplo.com', nombre: null } });
    await inicio;
    expect(servicio.token()).toBe('jwt-prueba');
    expect(servicio.usuario()?.email).toBe('usuario@ejemplo.com');
    servicio.cerrarSesion();
    expect(servicio.token()).toBeNull();
  });
});
