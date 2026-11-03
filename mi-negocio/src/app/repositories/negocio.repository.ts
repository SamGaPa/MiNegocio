import { Injectable, inject } from '@angular/core';
import { esEstadoLocalValido } from '../domain/validaciones';
import { EstadoLocal } from '../models/estado-local.model';
import { PreferencesStorageAdapter } from './preferences-storage.adapter';

export const CLAVE_ESTADO_LOCAL = 'mi-negocio:estado:v1';

export type ResultadoCargaEstado =
  | { tipo: 'sin-datos' }
  | { tipo: 'ok'; estado: EstadoLocal }
  | { tipo: 'datos-corruptos'; valorOriginal: string };

@Injectable({ providedIn: 'root' })
export class NegocioRepository {
  private readonly almacenamiento = inject(PreferencesStorageAdapter);

  async cargar(): Promise<ResultadoCargaEstado> {
    const valor = await this.almacenamiento.obtener(CLAVE_ESTADO_LOCAL);
    if (valor === null) {
      return { tipo: 'sin-datos' };
    }

    try {
      const candidato: unknown = JSON.parse(valor);
      if (!esEstadoLocalValido(candidato)) {
        return { tipo: 'datos-corruptos', valorOriginal: valor };
      }
      return { tipo: 'ok', estado: candidato };
    } catch {
      return { tipo: 'datos-corruptos', valorOriginal: valor };
    }
  }

  async guardar(estado: EstadoLocal): Promise<void> {
    if (!esEstadoLocalValido(estado)) {
      throw new Error('No se puede guardar un estado local inválido.');
    }
    await this.almacenamiento.guardar(CLAVE_ESTADO_LOCAL, JSON.stringify(estado));
  }

  async cargarParaUsuario(usuarioId: string): Promise<ResultadoCargaEstado> {
    return this.cargarDesdeClave(this.claveDeUsuario(usuarioId));
  }

  async guardarParaUsuario(usuarioId: string, estado: EstadoLocal): Promise<void> {
    if (!esEstadoLocalValido(estado)) {
      throw new Error('No se puede guardar un estado local inválido.');
    }
    await this.almacenamiento.guardar(this.claveDeUsuario(usuarioId), JSON.stringify(estado));
  }

  private async cargarDesdeClave(clave: string): Promise<ResultadoCargaEstado> {
    const valor = await this.almacenamiento.obtener(clave);
    if (valor === null) return { tipo: 'sin-datos' };
    try {
      const candidato: unknown = JSON.parse(valor);
      return esEstadoLocalValido(candidato)
        ? { tipo: 'ok', estado: candidato }
        : { tipo: 'datos-corruptos', valorOriginal: valor };
    } catch {
      return { tipo: 'datos-corruptos', valorOriginal: valor };
    }
  }

  private claveDeUsuario(usuarioId: string): string {
    return `${CLAVE_ESTADO_LOCAL}:usuario:${usuarioId}`;
  }
}
