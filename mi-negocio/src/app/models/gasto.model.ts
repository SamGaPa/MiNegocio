/** Importe expresado en pesos, con un máximo de dos decimales. */
export interface Gasto {
  id: string;
  fecha: string;
  concepto: string;
  categoria: string;
  importe: number;
}
