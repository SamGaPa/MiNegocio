import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { NegocioRepository } from '../repositories/negocio.repository';
import { NegocioService } from './negocio.service';

function crearContexto(opciones?: { guardar?: ReturnType<typeof vi.fn>; cargar?: ReturnType<typeof vi.fn> }) {
  const repositorio = {
    cargar: opciones?.cargar ?? vi.fn().mockResolvedValue({ tipo: 'sin-datos' }),
    guardar: opciones?.guardar ?? vi.fn().mockResolvedValue(undefined),
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [NegocioService, { provide: NegocioRepository, useValue: repositorio }] });
  return { servicio: TestBed.inject(NegocioService), repositorio };
}

describe('Casos P01 a P14', () => {
  it('P01 almacena un gasto válido con importe decimal', async () => {
    const { servicio } = crearContexto(); await servicio.inicializar();
    await servicio.agregarGasto({ fecha: '2026-10-15', concepto: 'Insumos', categoria: 'Material', importe: 125.5 });
    expect(servicio.gastos()[0].importe).toBe(125.5);
  });

  it('P02 rechaza gastos vacíos, cero y negativos', async () => {
    const { servicio } = crearContexto(); await servicio.inicializar();
    await expect(servicio.agregarGasto({ fecha: '2026-10-15', concepto: '', categoria: 'Material', importe: 1 })).rejects.toThrow();
    await expect(servicio.agregarGasto({ fecha: '2026-10-15', concepto: 'X', categoria: 'Material', importe: 0 })).rejects.toThrow();
    await expect(servicio.agregarGasto({ fecha: '2026-10-15', concepto: 'X', categoria: 'Material', importe: -1 })).rejects.toThrow();
    expect(servicio.gastos()).toHaveLength(0);
  });

  it('P03 suma 125.50 y 74.50 como 200.00', async () => {
    const { servicio } = crearContexto(); await servicio.inicializar();
    await servicio.agregarGasto({ fecha: '2026-10-01', concepto: 'A', categoria: 'C', importe: 125.5 });
    await servicio.agregarGasto({ fecha: '2026-10-02', concepto: 'B', categoria: 'C', importe: 74.5 });
    expect(servicio.totalGastosDelPeriodo(2026, 10)).toBe(200);
  });

  it('P04 filtra gastos por mes y año', async () => {
    const { servicio } = crearContexto(); await servicio.inicializar();
    await servicio.agregarGasto({ fecha: '2025-12-01', concepto: 'Diciembre', categoria: 'C', importe: 20 });
    await servicio.agregarGasto({ fecha: '2026-01-01', concepto: 'Enero', categoria: 'C', importe: 30 });
    expect(servicio.totalGastosDelPeriodo(2025, 12)).toBe(20);
    expect(servicio.totalGastosDelPeriodo(2026, 12)).toBe(0);
  });

  it('P05 edita y elimina gastos; no llamar eliminar representa cancelar', async () => {
    const { servicio } = crearContexto(); await servicio.inicializar();
    const gasto = await servicio.agregarGasto({ fecha: '2026-10-01', concepto: 'Original', categoria: 'C', importe: 10 });
    await servicio.editarGasto(gasto.id, { fecha: '2026-10-02', concepto: 'Editado', categoria: 'Nueva', importe: 25 });
    expect(servicio.gastos()[0]).toMatchObject({ concepto: 'Editado', importe: 25 });
    expect(servicio.gastos()).toHaveLength(1);
    await servicio.eliminarGasto(gasto.id);
    expect(servicio.gastos()).toHaveLength(0);
  });

  it('P06 crea stock inicial 10 y rechaza cantidades inválidas', async () => {
    const { servicio } = crearContexto(); await servicio.inicializar();
    const producto = await servicio.agregarProducto({ nombre: 'Taza', categoria: 'Hogar', stockInicial: 10, stockMinimo: 2, activo: true });
    expect(servicio.productosConStock()[0].existencia).toBe(10);
    await expect(servicio.agregarProducto({ nombre: 'X', categoria: 'C', stockInicial: -1, stockMinimo: 1, activo: true })).rejects.toThrow();
    await expect(servicio.agregarProducto({ nombre: 'X', categoria: 'C', stockInicial: 1.5, stockMinimo: 1, activo: true })).rejects.toThrow();
    expect(producto.stockInicial).toBe(10);
  });

  it('P07 y P08 aplica entrada/salida y rechaza exceso sin guardar', async () => {
    const { servicio, repositorio } = crearContexto(); await servicio.inicializar();
    const producto = await servicio.agregarProducto({ nombre: 'Taza', categoria: 'Hogar', stockInicial: 10, stockMinimo: 2, activo: true });
    await servicio.registrarMovimiento({ productoId: producto.id, tipo: 'entrada', cantidad: 5, fecha: '2026-10-01', motivo: 'Compra' });
    await servicio.registrarMovimiento({ productoId: producto.id, tipo: 'salida', cantidad: 3, fecha: '2026-10-01', motivo: 'Venta' });
    expect(servicio.productosConStock()[0].existencia).toBe(12);
    await expect(servicio.registrarMovimiento({ productoId: producto.id, tipo: 'salida', cantidad: 13, fecha: '2026-10-01', motivo: 'Venta' })).rejects.toThrow();
    expect(servicio.productosConStock()[0].existencia).toBe(12);
    expect(repositorio.guardar).toHaveBeenCalledTimes(3);
  });

  it('P09 identifica stock bajo en existencia igual al mínimo', async () => {
    const { servicio } = crearContexto(); await servicio.inicializar();
    await servicio.agregarProducto({ nombre: 'Vela', categoria: 'Hogar', stockInicial: 2, stockMinimo: 2, activo: true });
    expect(servicio.productosConStockBajo()).toHaveLength(1);
  });

  it('P10 recupera datos guardados al inicializar una nueva instancia', async () => {
    const estado = { schemaVersion: 1 as const, productos: [], movimientos: [], gastos: [{ id: 'g1', fecha: '2026-10-01', concepto: 'Guardado', categoria: 'C', importe: 10 }] };
    const { servicio } = crearContexto({ cargar: vi.fn().mockResolvedValue({ tipo: 'ok', estado }) });
    await servicio.inicializar();
    expect(servicio.gastos()).toEqual(estado.gastos);
  });

  it('P11 conserva estado si guardar falla y serializa doble envío', async () => {
    const guardar = vi.fn().mockRejectedValueOnce(new Error('fallo')).mockResolvedValue(undefined);
    const { servicio } = crearContexto({ guardar }); await servicio.inicializar();
    const datos = { fecha: '2026-10-01', concepto: 'Único', categoria: 'C', importe: 10 };
    const resultados = await Promise.allSettled([servicio.agregarGasto(datos), servicio.agregarGasto(datos)]);
    expect(resultados.map((r) => r.status)).toEqual(['rejected', 'fulfilled']);
    expect(servicio.gastos()).toHaveLength(1);
  });

  it('P12 mantiene gastos y movimientos independientes', async () => {
    const { servicio } = crearContexto(); await servicio.inicializar();
    const producto = await servicio.agregarProducto({ nombre: 'P', categoria: 'C', stockInicial: 1, stockMinimo: 0, activo: true });
    await servicio.agregarGasto({ fecha: '2026-10-01', concepto: 'Mercancía', categoria: 'C', importe: 10 });
    expect(servicio.movimientos()).toHaveLength(0);
    await servicio.registrarMovimiento({ productoId: producto.id, tipo: 'entrada', cantidad: 1, fecha: '2026-10-01', motivo: 'Compra' });
    expect(servicio.gastos()).toHaveLength(1);
  });

  it('P13 conserva historial inactivo e impide movimientos nuevos', async () => {
    const { servicio } = crearContexto(); await servicio.inicializar();
    const producto = await servicio.agregarProducto({ nombre: 'P', categoria: 'C', stockInicial: 2, stockMinimo: 1, activo: true });
    await servicio.registrarMovimiento({ productoId: producto.id, tipo: 'salida', cantidad: 1, fecha: '2026-10-01', motivo: 'Venta' });
    await servicio.actualizarEstadoProducto(producto.id, false);
    await expect(servicio.registrarMovimiento({ productoId: producto.id, tipo: 'entrada', cantidad: 1, fecha: '2026-10-01', motivo: 'Ajuste' })).rejects.toThrow('inactivo');
    expect(servicio.movimientos()).toHaveLength(1);
  });
});
