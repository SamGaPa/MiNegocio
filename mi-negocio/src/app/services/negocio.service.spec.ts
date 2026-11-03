import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { NegocioRepository } from '../repositories/negocio.repository';
import { NegocioApiRepository } from '../repositories/negocio-api.repository';
import { AuthService } from './auth.service';
import { NegocioService } from './negocio.service';

describe('NegocioService', () => {
  it('descarga el estado de la cuenta y lo guarda en una caché separada por usuario', async () => {
    const repositorio = { cargar: vi.fn().mockResolvedValue({ tipo: 'sin-datos' }), guardar: vi.fn(), guardarParaUsuario: vi.fn().mockResolvedValue(undefined) };
    const api = { cargar: vi.fn().mockResolvedValue({ schemaVersion: 1, productos: [], gastos: [{ id: 'g-1', fecha: '2026-11-03', concepto: 'Material', categoria: 'Insumos', importe: 20 }], movimientos: [] }) };
    const auth = { usuario: vi.fn(() => ({ id: 'usuario-1', email: 'persona@ejemplo.com', nombre: null })) };
    TestBed.configureTestingModule({ providers: [NegocioService, { provide: NegocioRepository, useValue: repositorio }, { provide: NegocioApiRepository, useValue: api }, { provide: AuthService, useValue: auth }] });
    const servicio = TestBed.inject(NegocioService);

    await servicio.inicializar();
    await servicio.sincronizarConServidor();

    expect(servicio.gastos()).toHaveLength(1);
    expect(repositorio.guardarParaUsuario).toHaveBeenCalledWith('usuario-1', expect.objectContaining({ gastos: expect.any(Array) }));
  });
  it('calcula las existencias desde el stock inicial y detecta stock bajo', async () => {
    const repositorio = {
      cargar: vi.fn().mockResolvedValue({ tipo: 'sin-datos' }),
      guardar: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [NegocioService, { provide: NegocioRepository, useValue: repositorio }],
    });
    const servicio = TestBed.inject(NegocioService);
    await servicio.inicializar();

    await servicio.agregarProducto({
      nombre: 'Pulsera azul',
      categoria: 'Accesorios',
      stockInicial: 10,
      stockMinimo: 10,
      activo: true,
    });

    expect(servicio.productosConStock()[0].existencia).toBe(10);
    expect(servicio.productosConStock()[0].stockBajo).toBe(true);
  });

  it('conserva el stock inicial al editar un producto', async () => {
    const repositorio = {
      cargar: vi.fn().mockResolvedValue({ tipo: 'sin-datos' }),
      guardar: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [NegocioService, { provide: NegocioRepository, useValue: repositorio }],
    });
    const servicio = TestBed.inject(NegocioService);
    await servicio.inicializar();
    const producto = await servicio.agregarProducto({
      nombre: 'Bolsa',
      categoria: 'Accesorios',
      stockInicial: 10,
      stockMinimo: 2,
      activo: true,
    });

    await servicio.editarProducto(producto.id, {
      nombre: 'Bolsa artesanal',
      categoria: 'Bolsas',
      stockMinimo: 3,
    });

    expect(servicio.productos()[0]).toMatchObject({ stockInicial: 10, stockMinimo: 3 });
  });

  it('conserva importes decimales y suma gastos correctamente', async () => {
    const repositorio = {
      cargar: vi.fn().mockResolvedValue({ tipo: 'sin-datos' }),
      guardar: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [NegocioService, { provide: NegocioRepository, useValue: repositorio }],
    });
    const servicio = TestBed.inject(NegocioService);
    await servicio.inicializar();
    await servicio.agregarGasto({ fecha: '2026-10-15', concepto: 'Insumos', categoria: 'Material', importe: 125.5 });
    await servicio.agregarGasto({ fecha: '2026-10-15', concepto: 'Envío', categoria: 'Logística', importe: 74.5 });

    expect(servicio.gastos().reduce((total, gasto) => total + gasto.importe, 0)).toBe(200);
    expect(servicio.gastos()[0].importe).toBe(125.5);
  });

  it('registra entradas y salidas sin permitir existencias negativas', async () => {
    const repositorio = {
      cargar: vi.fn().mockResolvedValue({ tipo: 'sin-datos' }),
      guardar: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [NegocioService, { provide: NegocioRepository, useValue: repositorio }],
    });
    const servicio = TestBed.inject(NegocioService);
    await servicio.inicializar();
    const producto = await servicio.agregarProducto({ nombre: 'Taza', categoria: 'Hogar', stockInicial: 10, stockMinimo: 2, activo: true });

    await servicio.registrarMovimiento({ productoId: producto.id, tipo: 'entrada', cantidad: 5, fecha: '2026-10-15', motivo: 'Compra' });
    await servicio.registrarMovimiento({ productoId: producto.id, tipo: 'salida', cantidad: 3, fecha: '2026-10-15', motivo: 'Venta' });
    expect(servicio.productosConStock()[0].existencia).toBe(12);

    await expect(servicio.registrarMovimiento({ productoId: producto.id, tipo: 'salida', cantidad: 13, fecha: '2026-10-15', motivo: 'Venta' })).rejects.toThrow('negativo');
    expect(servicio.productosConStock()[0].existencia).toBe(12);
    expect(repositorio.guardar).toHaveBeenCalledTimes(3);
  });

  it('calcula gastos por mes y solo cuenta productos activos con stock bajo', async () => {
    const repositorio = { cargar: vi.fn().mockResolvedValue({ tipo: 'sin-datos' }), guardar: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({ providers: [NegocioService, { provide: NegocioRepository, useValue: repositorio }] });
    const servicio = TestBed.inject(NegocioService);
    await servicio.inicializar();
    const producto = await servicio.agregarProducto({ nombre: 'Vela', categoria: 'Hogar', stockInicial: 2, stockMinimo: 2, activo: true });
    await servicio.agregarGasto({ fecha: '2026-10-01', concepto: 'Cera', categoria: 'Material', importe: 125.5 });
    await servicio.agregarGasto({ fecha: '2026-09-30', concepto: 'Caja', categoria: 'Material', importe: 74.5 });
    expect(servicio.totalGastosDelPeriodo(2026, 10)).toBe(125.5);
    expect(servicio.productosConStockBajo().length).toBe(1);
    await servicio.actualizarEstadoProducto(producto.id, false);
    expect(servicio.productosActivos().length).toBe(0);
    expect(servicio.productosConStockBajo().length).toBe(0);
  });
});
