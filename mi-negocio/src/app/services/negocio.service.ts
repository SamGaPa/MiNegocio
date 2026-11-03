import { computed, Injectable, inject, signal } from '@angular/core';
import { calcularExistencia, tieneStockBajo } from '../domain/stock';
import {
  ErrorDeDominio,
  normalizarImporte,
  validarGasto,
  validarMovimiento,
  validarProducto,
} from '../domain/validaciones';
import { crearEstadoLocalVacio, EstadoLocal } from '../models/estado-local.model';
import { Gasto } from '../models/gasto.model';
import { Movimiento } from '../models/movimiento.model';
import { Producto } from '../models/producto.model';
import { NegocioRepository, ResultadoCargaEstado } from '../repositories/negocio.repository';
import { NegocioApiRepository } from '../repositories/negocio-api.repository';
import { AuthService } from './auth.service';

export type ProductoNuevo = Omit<Producto, 'id'>;
export type ProductoEditable = Pick<Producto, 'nombre' | 'categoria' | 'stockMinimo'>;
export type GastoNuevo = Omit<Gasto, 'id'>;
export type GastoEditable = Omit<Gasto, 'id'>;
export type MovimientoNuevo = Omit<Movimiento, 'id'>;
export type EstadoDeCarga = 'pendiente' | 'listo' | 'datos-corruptos' | 'error';

@Injectable({ providedIn: 'root' })
export class NegocioService {
  private readonly repositorio = inject(NegocioRepository);
  private readonly api = inject(NegocioApiRepository);
  private readonly auth = inject(AuthService);
  private readonly estadoInterno = signal<EstadoLocal>(crearEstadoLocalVacio());
  private readonly estadoCargaInterno = signal<EstadoDeCarga>('pendiente');
  private colaDeEscrituras: Promise<void> = Promise.resolve();

  readonly estado = this.estadoInterno.asReadonly();
  readonly estadoDeCarga = this.estadoCargaInterno.asReadonly();
  readonly productos = computed(() => this.estadoInterno().productos);
  readonly gastos = computed(() => this.estadoInterno().gastos);
  readonly movimientos = computed(() => this.estadoInterno().movimientos);
  readonly productosConStock = computed(() => {
    const estado = this.estadoInterno();
    return estado.productos.map((producto) => ({
      producto,
      existencia: calcularExistencia(producto, estado.movimientos),
      stockBajo: tieneStockBajo(producto, estado.movimientos),
    }));
  });
  readonly productosActivos = computed(() => this.estadoInterno().productos.filter((producto) => producto.activo));
  readonly productosConStockBajo = computed(() =>
    this.productosConStock().filter((detalle) => detalle.producto.activo && detalle.stockBajo),
  );

  totalGastosDelPeriodo(anio: number, mes: number): number {
    const prefijo = `${anio}-${String(mes).padStart(2, '0')}`;
    return Math.round(
      this.gastos()
        .filter((gasto) => gasto.fecha.startsWith(prefijo))
        .reduce((total, gasto) => total + gasto.importe, 0) * 100,
    ) / 100;
  }

  inicializar(): Promise<ResultadoCargaEstado> {
    return this.encolar(async () => {
      try {
        const resultado = await this.repositorio.cargar();
        if (resultado.tipo === 'ok') {
          this.estadoInterno.set(resultado.estado);
          this.estadoCargaInterno.set('listo');
        } else if (resultado.tipo === 'sin-datos') {
          this.estadoInterno.set(crearEstadoLocalVacio());
          this.estadoCargaInterno.set('listo');
        } else {
          this.estadoCargaInterno.set('datos-corruptos');
        }
        return resultado;
      } catch (error) {
        this.estadoCargaInterno.set('error');
        throw error;
      }
    });
  }

  /** Descarga el estado aislado de la cuenta autenticada. La API es la fuente de verdad. */
  sincronizarConServidor(): Promise<void> {
    return this.encolar(async () => {
      const usuario = this.auth.usuario();
      if (!usuario) throw new Error('Inicia sesión para sincronizar tus datos.');
      const estado = await this.api.cargar();
      await this.repositorio.guardarParaUsuario(usuario.id, estado);
      this.estadoInterno.set(estado);
      this.estadoCargaInterno.set('listo');
    });
  }

  limpiarEstadoEnMemoria(): void {
    this.estadoInterno.set(crearEstadoLocalVacio());
    this.estadoCargaInterno.set('listo');
  }

  agregarProducto(datos: ProductoNuevo): Promise<Producto> {
    return this.mutar((estado) => {
      this.verificarLimite(estado.productos.length, 20, 'productos');
      const producto: Producto = {
        ...datos,
        id: crypto.randomUUID(),
        nombre: datos.nombre.trim(),
        categoria: datos.categoria.trim(),
      };
      validarProducto(producto);
      return { siguiente: { ...estado, productos: [...estado.productos, producto] }, resultado: producto };
    }, (producto) => this.api.crearProducto(producto));
  }

  editarProducto(id: string, datos: ProductoEditable): Promise<Producto> {
    return this.mutar((estado) => {
      const indice = estado.productos.findIndex((producto) => producto.id === id);
      if (indice === -1) {
        throw new ErrorDeDominio('El producto que deseas editar no existe.');
      }
      const anterior = estado.productos[indice];
      const producto: Producto = {
        ...anterior,
        nombre: datos.nombre.trim(),
        categoria: datos.categoria.trim(),
        stockMinimo: datos.stockMinimo,
      };
      validarProducto(producto);
      const productos = [...estado.productos];
      productos[indice] = producto;
      return { siguiente: { ...estado, productos }, resultado: producto };
    }, (producto) => this.api.actualizarProducto(id, { nombre: producto.nombre, categoria: producto.categoria, stockMinimo: producto.stockMinimo, activo: producto.activo }));
  }

  actualizarEstadoProducto(id: string, activo: boolean): Promise<Producto> {
    return this.mutar((estado) => {
      const indice = estado.productos.findIndex((producto) => producto.id === id);
      if (indice === -1) {
        throw new ErrorDeDominio('El producto que deseas actualizar no existe.');
      }
      const productos = [...estado.productos];
      const producto: Producto = { ...productos[indice], activo };
      validarProducto(producto);
      productos[indice] = producto;
      return { siguiente: { ...estado, productos }, resultado: producto };
    }, (producto) => this.api.actualizarProducto(id, { nombre: producto.nombre, categoria: producto.categoria, stockMinimo: producto.stockMinimo, activo: producto.activo }));
  }

  agregarGasto(datos: GastoNuevo): Promise<Gasto> {
    return this.mutar((estado) => {
      this.verificarLimite(estado.gastos.length, 100, 'gastos');
      const gasto: Gasto = {
        ...datos,
        id: crypto.randomUUID(),
        concepto: datos.concepto.trim(),
        categoria: datos.categoria.trim(),
        importe: normalizarImporte(datos.importe),
      };
      validarGasto(gasto);
      return { siguiente: { ...estado, gastos: [...estado.gastos, gasto] }, resultado: gasto };
    }, (gasto) => this.api.crearGasto(gasto));
  }

  editarGasto(id: string, datos: GastoEditable): Promise<Gasto> {
    return this.mutar((estado) => {
      const indice = estado.gastos.findIndex((gasto) => gasto.id === id);
      if (indice === -1) {
        throw new ErrorDeDominio('El gasto que deseas editar no existe.');
      }
      const gasto: Gasto = {
        ...datos,
        id,
        concepto: datos.concepto.trim(),
        categoria: datos.categoria.trim(),
        importe: normalizarImporte(datos.importe),
      };
      validarGasto(gasto);
      const gastos = [...estado.gastos];
      gastos[indice] = gasto;
      return { siguiente: { ...estado, gastos }, resultado: gasto };
    }, (gasto) => this.api.actualizarGasto(id, { fecha: gasto.fecha, concepto: gasto.concepto, categoria: gasto.categoria, importe: gasto.importe }));
  }

  eliminarGasto(id: string): Promise<void> {
    return this.mutar((estado) => {
      if (!estado.gastos.some((gasto) => gasto.id === id)) {
        throw new ErrorDeDominio('El gasto que deseas eliminar no existe.');
      }
      const gastos = estado.gastos.filter((gasto) => gasto.id !== id);
      return { siguiente: { ...estado, gastos }, resultado: undefined };
    }, () => this.api.eliminarGasto(id));
  }

  registrarMovimiento(datos: MovimientoNuevo): Promise<Movimiento> {
    return this.mutar((estado) => {
      this.verificarLimite(estado.movimientos.length, 100, 'movimientos');
      const movimiento: Movimiento = {
        ...datos,
        id: crypto.randomUUID(),
        motivo: datos.motivo.trim(),
      };
      validarMovimiento(movimiento);
      const producto = estado.productos.find((item) => item.id === movimiento.productoId);
      if (!producto) {
        throw new ErrorDeDominio('El producto del movimiento no existe.');
      }
      if (!producto.activo) {
        throw new ErrorDeDominio('No se pueden registrar movimientos para un producto inactivo.');
      }
      const movimientos = [...estado.movimientos, movimiento];
      if (calcularExistencia(producto, movimientos) < 0) {
        throw new ErrorDeDominio('El movimiento dejaría la existencia del producto en negativo.');
      }
      return { siguiente: { ...estado, movimientos }, resultado: movimiento };
    }, (movimiento) => this.api.crearMovimiento(movimiento));
  }

  private mutar<T>(operacion: (estado: EstadoLocal) => { siguiente: EstadoLocal; resultado: T }, persistirEnApi: (resultado: T) => Promise<void>): Promise<T> {
    return this.encolar(async () => {
      if (this.estadoCargaInterno() !== 'listo') {
        throw new Error('El estado debe inicializarse correctamente antes de modificarlo.');
      }
      const { siguiente, resultado } = operacion(this.estadoInterno());
      const usuario = this.auth.usuario();
      if (usuario) {
        await persistirEnApi(resultado);
        await this.repositorio.guardarParaUsuario(usuario.id, siguiente);
      } else {
        // Compatibilidad temporal: la información sin sesión nunca se envía a otra cuenta.
        await this.repositorio.guardar(siguiente);
      }
      this.estadoInterno.set(siguiente);
      return resultado;
    });
  }

  private encolar<T>(operacion: () => Promise<T>): Promise<T> {
    const trabajo = this.colaDeEscrituras.then(operacion);
    this.colaDeEscrituras = trabajo.then(
      () => undefined,
      () => undefined,
    );
    return trabajo;
  }

  private verificarLimite(actual: number, maximo: number, entidad: string): void {
    if (actual >= maximo) {
      throw new ErrorDeDominio(`El prototipo permite un máximo de ${maximo} ${entidad}.`);
    }
  }
}
