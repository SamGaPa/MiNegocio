import { Movimiento } from '../models/movimiento.model';
import { Producto } from '../models/producto.model';

export function calcularExistencia(producto: Producto, movimientos: readonly Movimiento[]): number {
  return movimientos
    .filter((movimiento) => movimiento.productoId === producto.id)
    .reduce(
      (existencia, movimiento) =>
        movimiento.tipo === 'entrada'
          ? existencia + movimiento.cantidad
          : existencia - movimiento.cantidad,
      producto.stockInicial,
    );
}

export function tieneStockBajo(producto: Producto, movimientos: readonly Movimiento[]): boolean {
  return calcularExistencia(producto, movimientos) <= producto.stockMinimo;
}
