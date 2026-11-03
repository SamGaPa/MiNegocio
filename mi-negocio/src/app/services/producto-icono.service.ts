import { Injectable } from '@angular/core';

const URL_DICEBEAR = 'https://api.dicebear.com/10.x/icons/svg';

/** Genera una URL visual determinista; no descarga ni persiste imágenes. */
@Injectable({ providedIn: 'root' })
export class ProductoIconoService {
  obtenerUrl(idProducto: string): string {
    const parametros = new URLSearchParams({
      seed: idProducto,
      backgroundColor: 'fff7e8',
      radius: '50',
    });
    return `${URL_DICEBEAR}?${parametros.toString()}`;
  }
}
