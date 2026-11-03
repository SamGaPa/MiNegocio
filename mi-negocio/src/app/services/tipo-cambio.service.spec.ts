import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TipoCambioService, validarRespuestaTipoCambio } from './tipo-cambio.service';

describe('TipoCambioService', () => {
  let servicio: TipoCambioService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), TipoCambioService] });
    servicio = TestBed.inject(TipoCambioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });

  it('obtiene la tasa USD/MXN sin enviar autorización ni credenciales', async () => {
    const consulta = servicio.consultarUsdMxn();
    const solicitud = http.expectOne('https://api.frankfurter.dev/v2/rate/usd/mxn');
    expect(solicitud.request.method).toBe('GET');
    expect(solicitud.request.headers.has('Authorization')).toBe(false);
    expect(solicitud.request.withCredentials).toBe(false);
    solicitud.flush({ date: '2026-10-28', base: 'USD', quote: 'MXN', rate: 20 });
    await expect(consulta).resolves.toEqual({ date: '2026-10-28', base: 'USD', quote: 'MXN', rate: 20 });
  });

  it('rechaza respuestas con una tasa o par de monedas inválido', () => {
    expect(() => validarRespuestaTipoCambio({ date: '2026-10-28', base: 'USD', quote: 'MXN', rate: 0 })).toThrow('tasa');
    expect(() => validarRespuestaTipoCambio({ date: '2026-10-28', base: 'EUR', quote: 'MXN', rate: 20 })).toThrow('par USD/MXN');
  });

  it('maneja un error de red', async () => {
    const consulta = servicio.consultarUsdMxn();
    const solicitud = http.expectOne('https://api.frankfurter.dev/v2/rate/usd/mxn');
    solicitud.error(new ProgressEvent('error'));
    await expect(consulta).rejects.toBeTruthy();
  });

  it('cancela la consulta al superar el tiempo de espera', async () => {
    vi.useFakeTimers();
    const consulta = servicio.consultarUsdMxn();
    const rechazoEsperado = expect(consulta).rejects.toMatchObject({ name: 'TimeoutError' });
    http.expectOne('https://api.frankfurter.dev/v2/rate/usd/mxn');
    await vi.advanceTimersByTimeAsync(10_000);
    await rechazoEsperado;
    vi.useRealTimers();
  });
});
