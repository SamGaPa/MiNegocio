import { Gasto } from './gasto.model';
import { Movimiento } from './movimiento.model';
import { Producto } from './producto.model';

export const SCHEMA_VERSION = 1 as const;

export interface EstadoLocal {
  schemaVersion: typeof SCHEMA_VERSION;
  productos: Producto[];
  gastos: Gasto[];
  movimientos: Movimiento[];
}

export function crearEstadoLocalVacio(): EstadoLocal {
  return {
    schemaVersion: SCHEMA_VERSION,
    productos: [],
    gastos: [],
    movimientos: [],
  };
}
