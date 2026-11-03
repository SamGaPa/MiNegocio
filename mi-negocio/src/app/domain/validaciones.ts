import { EstadoLocal, SCHEMA_VERSION } from '../models/estado-local.model';
import { Gasto } from '../models/gasto.model';
import { Movimiento } from '../models/movimiento.model';
import { Producto } from '../models/producto.model';
import { calcularExistencia } from './stock';

export class ErrorDeDominio extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorDeDominio';
  }
}

export function validarProducto(producto: Producto): void {
  validarTexto(producto.id, 'El id del producto es obligatorio.');
  validarTexto(producto.nombre, 'El nombre del producto es obligatorio.');
  validarTexto(producto.categoria, 'La categoría del producto es obligatoria.');
  validarEnteroNoNegativo(producto.stockInicial, 'El stock inicial');
  validarEnteroNoNegativo(producto.stockMinimo, 'El stock mínimo');
  if (typeof producto.activo !== 'boolean') {
    throw new ErrorDeDominio('El estado activo del producto debe ser booleano.');
  }
}

export function validarGasto(gasto: Gasto): void {
  validarTexto(gasto.id, 'El id del gasto es obligatorio.');
  validarFechaLocal(gasto.fecha);
  validarTexto(gasto.concepto, 'El concepto del gasto es obligatorio.');
  validarTexto(gasto.categoria, 'La categoría del gasto es obligatoria.');
  validarImporte(gasto.importe);
}

export function validarMovimiento(movimiento: Movimiento): void {
  validarTexto(movimiento.id, 'El id del movimiento es obligatorio.');
  validarTexto(movimiento.productoId, 'El producto del movimiento es obligatorio.');
  if (movimiento.tipo !== 'entrada' && movimiento.tipo !== 'salida') {
    throw new ErrorDeDominio('El tipo de movimiento debe ser entrada o salida.');
  }
  if (!Number.isInteger(movimiento.cantidad) || movimiento.cantidad <= 0) {
    throw new ErrorDeDominio('La cantidad del movimiento debe ser un entero estrictamente positivo.');
  }
  validarFechaLocal(movimiento.fecha);
  validarTexto(movimiento.motivo, 'El motivo del movimiento es obligatorio.');
}

export function validarImporte(importe: number): void {
  if (!Number.isFinite(importe) || importe <= 0 || !tieneMaximoDosDecimales(importe)) {
    throw new ErrorDeDominio('El importe debe ser mayor que cero y tener máximo dos decimales.');
  }
}

export function normalizarImporte(importe: number): number {
  validarImporte(importe);
  return Math.round(importe * 100) / 100;
}

export function validarFechaLocal(fecha: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new ErrorDeDominio('La fecha debe usar el formato local YYYY-MM-DD.');
  }
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const comprobacion = new Date(anio, mes - 1, dia);
  if (
    comprobacion.getFullYear() !== anio ||
    comprobacion.getMonth() !== mes - 1 ||
    comprobacion.getDate() !== dia
  ) {
    throw new ErrorDeDominio('La fecha no es válida.');
  }
}

export function esEstadoLocalValido(valor: unknown): valor is EstadoLocal {
  if (!esRegistro(valor) || valor['schemaVersion'] !== SCHEMA_VERSION) {
    return false;
  }
  const productos = valor['productos'];
  const gastos = valor['gastos'];
  const movimientos = valor['movimientos'];
  if (!Array.isArray(productos) || !Array.isArray(gastos) || !Array.isArray(movimientos)) {
    return false;
  }
  try {
    productos.forEach((producto) => validarProducto(producto as Producto));
    gastos.forEach((gasto) => validarGasto(gasto as Gasto));
    movimientos.forEach((movimiento) => validarMovimiento(movimiento as Movimiento));
    if (productos.length > 20 || gastos.length > 100 || movimientos.length > 100) {
      return false;
    }
    const idsDeProductos = new Set(productos.map((producto) => (producto as Producto).id));
    if (idsDeProductos.size !== productos.length) {
      return false;
    }
    if (movimientos.some((movimiento) => !idsDeProductos.has((movimiento as Movimiento).productoId))) {
      return false;
    }
    if (
      productos.some(
        (producto) => calcularExistencia(producto as Producto, movimientos as Movimiento[]) < 0,
      )
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function validarTexto(valor: unknown, mensaje: string): void {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw new ErrorDeDominio(mensaje);
  }
}

function validarEnteroNoNegativo(valor: unknown, etiqueta: string): void {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0) {
    throw new ErrorDeDominio(`${etiqueta} debe ser un entero no negativo.`);
  }
}

function tieneMaximoDosDecimales(valor: number): boolean {
  return Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-8;
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}
