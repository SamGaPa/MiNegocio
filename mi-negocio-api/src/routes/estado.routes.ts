import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requerirAutenticacion, type SolicitudAutenticada } from '../auth.js';
import { pool } from '../db.js';

const producto = z.object({ id: z.string().uuid().optional(), nombre: z.string().trim().min(1).max(120), categoria: z.string().trim().min(1).max(100), stockInicial: z.number().int().nonnegative(), stockMinimo: z.number().int().nonnegative(), activo: z.boolean().default(true) });
const productoActualizable = z.object({ nombre: z.string().trim().min(1).max(120), categoria: z.string().trim().min(1).max(100), stockMinimo: z.number().int().nonnegative(), activo: z.boolean() });
const gasto = z.object({ id: z.string().uuid().optional(), fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), concepto: z.string().trim().min(1).max(160), categoria: z.string().trim().min(1).max(100), importe: z.number().positive().multipleOf(0.01) });
const gastoActualizable = gasto.omit({ id: true });
const movimiento = z.object({ id: z.string().uuid().optional(), productoId: z.string().uuid(), tipo: z.enum(['entrada', 'salida']), cantidad: z.number().int().positive(), fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), motivo: z.string().trim().min(1).max(200) });
export const estadoRouter = Router();
estadoRouter.use(requerirAutenticacion);

estadoRouter.get('/', async (req: SolicitudAutenticada, res, next) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const [productos] = await pool.execute<any[]>('SELECT id,nombre,categoria,stock_inicial AS stockInicial,stock_minimo AS stockMinimo,activo FROM productos WHERE usuario_id=? ORDER BY creado_en DESC', [usuarioId]);
    const [gastos] = await pool.execute<any[]>('SELECT id,DATE_FORMAT(fecha, "%Y-%m-%d") AS fecha,concepto,categoria,importe FROM gastos WHERE usuario_id=? ORDER BY fecha DESC', [usuarioId]);
    const [movimientos] = await pool.execute<any[]>('SELECT id,producto_id AS productoId,tipo,cantidad,DATE_FORMAT(fecha, "%Y-%m-%d") AS fecha,motivo FROM movimientos WHERE usuario_id=? ORDER BY fecha DESC, creado_en DESC', [usuarioId]);
    res.json({
      schemaVersion: 1,
      productos: productos.map((item) => ({ ...item, stockInicial: Number(item.stockInicial), stockMinimo: Number(item.stockMinimo), activo: Boolean(item.activo) })),
      gastos: gastos.map((item) => ({ ...item, importe: Number(item.importe) })),
      movimientos: movimientos.map((item) => ({ ...item, cantidad: Number(item.cantidad) })),
    });
  } catch (error) { next(error); }
});

estadoRouter.post('/productos', async (req: SolicitudAutenticada, res, next) => {
  try {
    const datos = producto.parse(req.body); const id = datos.id ?? randomUUID(); const usuarioId = obtenerUsuarioId(req);
    await verificarLimite(usuarioId, 'productos', 20);
    await pool.execute('INSERT INTO productos (id,usuario_id,nombre,categoria,stock_inicial,stock_minimo,activo) VALUES (?,?,?,?,?,?,?)', [id, usuarioId, datos.nombre, datos.categoria, datos.stockInicial, datos.stockMinimo, datos.activo]);
    res.status(201).json({ id, ...datos });
  } catch (error) { next(error); }
});

estadoRouter.patch('/productos/:id', async (req: SolicitudAutenticada, res, next) => {
  try {
    const datos = productoActualizable.parse(req.body); const usuarioId = obtenerUsuarioId(req);
    const [resultado] = await pool.execute<any>('UPDATE productos SET nombre=?, categoria=?, stock_minimo=?, activo=? WHERE id=? AND usuario_id=?', [datos.nombre, datos.categoria, datos.stockMinimo, datos.activo, req.params.id, usuarioId]);
    if (resultado.affectedRows === 0) { res.status(404).json({ error: 'El producto no existe.' }); return; }
    res.status(204).end();
  } catch (error) { next(error); }
});

estadoRouter.post('/gastos', async (req: SolicitudAutenticada, res, next) => {
  try {
    const datos = gasto.parse(req.body); const id = datos.id ?? randomUUID(); const usuarioId = obtenerUsuarioId(req);
    await verificarLimite(usuarioId, 'gastos', 100);
    await pool.execute('INSERT INTO gastos (id,usuario_id,fecha,concepto,categoria,importe) VALUES (?,?,?,?,?,?)', [id, usuarioId, datos.fecha, datos.concepto, datos.categoria, datos.importe]);
    res.status(201).json({ id, ...datos });
  } catch (error) { next(error); }
});

estadoRouter.patch('/gastos/:id', async (req: SolicitudAutenticada, res, next) => {
  try {
    const datos = gastoActualizable.parse(req.body); const usuarioId = obtenerUsuarioId(req);
    const [resultado] = await pool.execute<any>('UPDATE gastos SET fecha=?, concepto=?, categoria=?, importe=? WHERE id=? AND usuario_id=?', [datos.fecha, datos.concepto, datos.categoria, datos.importe, req.params.id, usuarioId]);
    if (resultado.affectedRows === 0) { res.status(404).json({ error: 'El gasto no existe.' }); return; }
    res.status(204).end();
  } catch (error) { next(error); }
});

estadoRouter.delete('/gastos/:id', async (req: SolicitudAutenticada, res, next) => {
  try {
    const [resultado] = await pool.execute<any>('DELETE FROM gastos WHERE id=? AND usuario_id=?', [req.params.id, obtenerUsuarioId(req)]);
    if (resultado.affectedRows === 0) { res.status(404).json({ error: 'El gasto no existe.' }); return; }
    res.status(204).end();
  } catch (error) { next(error); }
});

estadoRouter.post('/movimientos', async (req: SolicitudAutenticada, res, next) => {
  try {
    const datos = movimiento.parse(req.body); const usuarioId = obtenerUsuarioId(req); const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      const [conteo] = await conexion.execute<any[]>('SELECT COUNT(*) AS total FROM movimientos WHERE usuario_id=?', [usuarioId]);
      if (Number(conteo[0]?.total) >= 100) { await conexion.rollback(); res.status(409).json({ error: 'El prototipo permite un máximo de 100 movimientos.' }); return; }
      const [filas] = await conexion.execute<any[]>('SELECT p.stock_inicial, p.activo, COALESCE(SUM(CASE WHEN m.tipo="entrada" THEN m.cantidad ELSE -m.cantidad END),0) AS diferencia FROM productos p LEFT JOIN movimientos m ON m.producto_id=p.id AND m.usuario_id=p.usuario_id WHERE p.id=? AND p.usuario_id=? GROUP BY p.id, p.stock_inicial, p.activo FOR UPDATE', [datos.productoId, usuarioId]);
      const item = filas[0];
      if (!item) { await conexion.rollback(); res.status(404).json({ error: 'El producto no existe.' }); return; }
      if (!item.activo) { await conexion.rollback(); res.status(409).json({ error: 'El producto está inactivo.' }); return; }
      const existencia = Number(item.stock_inicial) + Number(item.diferencia);
      if (datos.tipo === 'salida' && datos.cantidad > existencia) { await conexion.rollback(); res.status(409).json({ error: 'La salida excede las existencias disponibles.' }); return; }
      const id = datos.id ?? randomUUID();
      await conexion.execute('INSERT INTO movimientos (id,usuario_id,producto_id,tipo,cantidad,fecha,motivo) VALUES (?,?,?,?,?,?,?)', [id, usuarioId, datos.productoId, datos.tipo, datos.cantidad, datos.fecha, datos.motivo]);
      await conexion.commit(); res.status(201).json({ id, ...datos });
    } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
  } catch (error) { next(error); }
});

function obtenerUsuarioId(req: SolicitudAutenticada): string {
  if (!req.usuarioId) throw new Error('No se encontró el usuario autenticado.');
  return req.usuarioId;
}

async function verificarLimite(usuarioId: string, tabla: 'productos' | 'gastos', maximo: number): Promise<void> {
  const [filas] = await pool.execute<any[]>(`SELECT COUNT(*) AS total FROM ${tabla} WHERE usuario_id=?`, [usuarioId]);
  if (Number(filas[0]?.total) >= maximo) {
    throw Object.assign(new Error(`El prototipo permite un máximo de ${maximo} ${tabla}.`), { status: 409 });
  }
}
