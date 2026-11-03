import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, throwError, timeout } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TipoCambioUsdMxn } from '../models/tipo-cambio.model';

const URL_TASA_USD_MXN = 'https://api.frankfurter.dev/v2/rate/usd/mxn';
const TIEMPO_ESPERA_MS = 10_000;

@Injectable({ providedIn: 'root' })
export class TipoCambioService {
  private readonly http = inject(HttpClient);

  consultarUsdMxn(): Promise<TipoCambioUsdMxn> {
    return firstValueFrom(
      this.http.get<unknown>(URL_TASA_USD_MXN).pipe(
        timeout(TIEMPO_ESPERA_MS),
        map((respuesta) => validarRespuestaTipoCambio(respuesta)),
        catchError((error: unknown) => throwError(() => error)),
      ),
    );
  }
}

export function validarRespuestaTipoCambio(valor: unknown): TipoCambioUsdMxn {
  if (!esRegistro(valor) || valor['base'] !== 'USD' || valor['quote'] !== 'MXN') {
    throw new Error('La respuesta de tipo de cambio no corresponde al par USD/MXN.');
  }
  const rate = valor['rate'];
  const date = valor['date'];
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('La tasa recibida no es válida.');
  }
  if (typeof date !== 'string' || !esFechaIsoValida(date)) {
    throw new Error('La fecha de la tasa recibida no es válida.');
  }
  return { base: 'USD', quote: 'MXN', rate, date };
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function esFechaIsoValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const comprobacion = new Date(Date.UTC(anio, mes - 1, dia));
  return comprobacion.getUTCFullYear() === anio && comprobacion.getUTCMonth() === mes - 1 && comprobacion.getUTCDate() === dia;
}
