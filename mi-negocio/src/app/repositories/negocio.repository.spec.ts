import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { PreferencesStorageAdapter } from './preferences-storage.adapter';
import { CLAVE_ESTADO_LOCAL, NegocioRepository } from './negocio.repository';

describe('NegocioRepository', () => {
  it('P14 detecta JSON inválido y no intenta sobrescribirlo', async () => {
    const adaptador = { obtener: vi.fn().mockResolvedValue('{invalido'), guardar: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({ providers: [NegocioRepository, { provide: PreferencesStorageAdapter, useValue: adaptador }] });
    const repositorio = TestBed.inject(NegocioRepository);
    await expect(repositorio.cargar()).resolves.toEqual({ tipo: 'datos-corruptos', valorOriginal: '{invalido' });
    expect(adaptador.obtener).toHaveBeenCalledWith(CLAVE_ESTADO_LOCAL);
    expect(adaptador.guardar).not.toHaveBeenCalled();
  });
});
