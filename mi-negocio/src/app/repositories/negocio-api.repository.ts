import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { esEstadoLocalValido } from '../domain/validaciones';
import { EstadoLocal } from '../models/estado-local.model';
import { Gasto } from '../models/gasto.model';
import { Movimiento } from '../models/movimiento.model';
import { Producto } from '../models/producto.model';

/** Cliente de la API propia. El interceptor adjunta el JWT únicamente a esta URL. */
@Injectable({ providedIn: 'root' })
export class NegocioApiRepository {
  private readonly http = inject(HttpClient);
  private readonly urlBase = `${environment.apiUrl}/api/v1/estado`;

  async cargar(): Promise<EstadoLocal> {
    try {
      const estado = await firstValueFrom(this.http.get<unknown>(this.urlBase));
      if (!esEstadoLocalValido(estado)) throw new Error('La API devolvió datos de negocio inválidos.');
      return estado;
    } catch (error) {
      throw new Error(mensajeDeApi(error));
    }
  }

  crearProducto(producto: Producto): Promise<void> { return this.enviar('post', '/productos', producto); }
  actualizarProducto(id: string, producto: Pick<Producto, 'nombre' | 'categoria' | 'stockMinimo' | 'activo'>): Promise<void> {
    return this.enviar('patch', `/productos/${encodeURIComponent(id)}`, producto);
  }
  crearGasto(gasto: Gasto): Promise<void> { return this.enviar('post', '/gastos', gasto); }
  actualizarGasto(id: string, gasto: Omit<Gasto, 'id'>): Promise<void> {
    return this.enviar('patch', `/gastos/${encodeURIComponent(id)}`, gasto);
  }
  eliminarGasto(id: string): Promise<void> { return this.enviar('delete', `/gastos/${encodeURIComponent(id)}`); }
  crearMovimiento(movimiento: Movimiento): Promise<void> { return this.enviar('post', '/movimientos', movimiento); }

  private async enviar(metodo: 'post' | 'patch' | 'delete', ruta: string, cuerpo?: object): Promise<void> {
    try {
      const url = `${this.urlBase}${ruta}`;
      const solicitud = metodo === 'delete'
        ? this.http.delete(url)
        : metodo === 'post'
          ? this.http.post(url, cuerpo)
          : this.http.patch(url, cuerpo);
      await firstValueFrom(solicitud);
    } catch (error) {
      throw new Error(mensajeDeApi(error));
    }
  }
}

function mensajeDeApi(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No fue posible conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    if (error.status === 401) return 'Tu sesión ya no es válida. Inicia sesión nuevamente.';
    if (typeof error.error?.error === 'string') return error.error.error;
  }
  return error instanceof Error ? error.message : 'No fue posible sincronizar con el servidor.';
}
