export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  stockInicial: number;
  stockMinimo: number;
  activo: boolean;
}