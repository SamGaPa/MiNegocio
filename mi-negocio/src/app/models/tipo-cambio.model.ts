/** Dato validado recibido desde Frankfurter v2 para el par USD/MXN. */
export interface TipoCambioUsdMxn {
  date: string;
  base: 'USD';
  quote: 'MXN';
  rate: number;
}
