export type TipoMovimiento = 'entrada' | 'salida';

export interface Movimiento {
  id: string;
  productoId: string;
  tipo: TipoMovimiento;
  cantidad: number;
  fecha: string;
  motivo: string;
}
