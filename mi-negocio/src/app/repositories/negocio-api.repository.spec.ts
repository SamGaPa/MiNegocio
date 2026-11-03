import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { NegocioApiRepository } from './negocio-api.repository';

describe('NegocioApiRepository', () => {
  it('carga el estado remoto validado y usa la ruta protegida de la API propia', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), NegocioApiRepository] });
    const repositorio = TestBed.inject(NegocioApiRepository);
    const http = TestBed.inject(HttpTestingController);

    const carga = repositorio.cargar();
    const solicitud = http.expectOne('http://localhost:3000/api/v1/estado');
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush({ schemaVersion: 1, productos: [], gastos: [], movimientos: [] });

    await expect(carga).resolves.toEqual({ schemaVersion: 1, productos: [], gastos: [], movimientos: [] });
    http.verify();
  });

  it('rechaza una respuesta remota que no cumple el contrato de estado', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), NegocioApiRepository] });
    const repositorio = TestBed.inject(NegocioApiRepository);
    const http = TestBed.inject(HttpTestingController);

    const carga = repositorio.cargar();
    http.expectOne('http://localhost:3000/api/v1/estado').flush({ schemaVersion: 1, productos: [{ id: 'p', activo: 1 }], gastos: [], movimientos: [] });

    await expect(carga).rejects.toThrow('datos de negocio inválidos');
    http.verify();
  });
});
