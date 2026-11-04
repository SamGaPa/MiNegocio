import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { compararHash, generarHash, generarToken } from '../auth.js';
import { pool } from '../db.js';
import { enviarCodigoDeAcceso, type PropositoCorreo } from '../email.service.js';

const correo = z.string().trim().email().max(254).transform((valor) => valor.toLowerCase());
const contrasena = z.string().min(8).max(72);
const codigo = z.string().trim().toUpperCase().regex(/^[A-F0-9]{10}$/, 'El código no tiene el formato esperado.');
const registro = z.object({ email: correo, contrasena, nombre: z.string().trim().min(1).max(100).optional(), aceptaAvisoPrivacidad: z.literal(true) });
const acceso = z.object({ email: correo, contrasena: z.string().min(1).max(72) });
const confirmarCodigo = z.object({ email: correo, codigo });
const restablecer = confirmarCodigo.extend({ contrasena });

export const authRouter = Router();

authRouter.post('/registro', async (req, res, next) => {
  try {
    const datos = registro.parse(req.body);
    const id = randomUUID();
    await pool.execute('INSERT INTO usuarios (id,email,password_hash,nombre,email_verificado,aviso_privacidad_version,consentimiento_fecha) VALUES (?,?,?,?,?,?,NOW())', [id, datos.email, await generarHash(datos.contrasena), datos.nombre ?? null, false, '1.0']);
    await emitirYEnviarCodigo(id, datos.email, 'verificacion_email');
    res.status(201).json({ requiereVerificacion: true, email: datos.email });
  } catch (error) { next(error); }
});

authRouter.post('/verificacion/solicitar', async (req, res, next) => {
  try {
    const email = correo.parse(req.body?.email);
    const [filas] = await pool.execute<any[]>('SELECT id,email_verificado FROM usuarios WHERE email=?', [email]);
    const usuario = filas[0];
    if (usuario && !usuario.email_verificado) await emitirYEnviarCodigo(usuario.id, email, 'verificacion_email');
    res.status(202).json({ mensaje: 'Si existe una cuenta pendiente, enviamos un código de verificación.' });
  } catch (error) { next(error); }
});

authRouter.post('/verificacion/confirmar', async (req, res, next) => {
  try {
    const datos = confirmarCodigo.parse(req.body);
    const usuario = await consumirCodigo(datos.email, datos.codigo, 'verificacion_email');
    if (!usuario) { res.status(400).json({ error: 'El código no es válido o venció.' }); return; }
    await pool.execute('UPDATE usuarios SET email_verificado=TRUE WHERE id=?', [usuario.id]);
    res.json(respuestaDeSesion(usuario));
  } catch (error) { next(error); }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const datos = acceso.parse(req.body);
    const [filas] = await pool.execute<any[]>('SELECT id,email,nombre,password_hash,email_verificado FROM usuarios WHERE email = ?', [datos.email]);
    const usuario = filas[0];
    if (!usuario || !(await compararHash(datos.contrasena, usuario.password_hash))) { res.status(401).json({ error: 'Correo o contraseña incorrectos.' }); return; }
    if (!usuario.email_verificado) { res.status(403).json({ error: 'Confirma tu correo antes de iniciar sesión.' }); return; }
    res.json(respuestaDeSesion(usuario));
  } catch (error) { next(error); }
});

authRouter.post('/recuperacion/solicitar', async (req, res, next) => {
  try {
    const email = correo.parse(req.body?.email);
    const [filas] = await pool.execute<any[]>('SELECT id,email_verificado FROM usuarios WHERE email=?', [email]);
    const usuario = filas[0];
    if (usuario?.email_verificado) await emitirYEnviarCodigo(usuario.id, email, 'recuperacion_contrasena');
    res.status(202).json({ mensaje: 'Si existe una cuenta verificada, enviamos un código de recuperación.' });
  } catch (error) { next(error); }
});

authRouter.post('/recuperacion/confirmar', async (req, res, next) => {
  try {
    const datos = restablecer.parse(req.body);
    const usuario = await consumirCodigo(datos.email, datos.codigo, 'recuperacion_contrasena');
    if (!usuario) { res.status(400).json({ error: 'El código no es válido o venció.' }); return; }
    await pool.execute('UPDATE usuarios SET password_hash=? WHERE id=?', [await generarHash(datos.contrasena), usuario.id]);
    res.status(204).end();
  } catch (error) { next(error); }
});

async function emitirYEnviarCodigo(usuarioId: string, email: string, proposito: PropositoCorreo): Promise<void> {
  const [recientes] = await pool.execute<any[]>('SELECT id FROM codigos_autenticacion WHERE usuario_id=? AND proposito=? AND creado_en > DATE_SUB(NOW(), INTERVAL 60 SECOND) ORDER BY creado_en DESC LIMIT 1', [usuarioId, proposito]);
  if (recientes.length > 0) throw Object.assign(new Error('Espera un minuto antes de solicitar otro código.'), { status: 429 });
  const valor = randomBytes(5).toString('hex').toUpperCase();
  await pool.execute('UPDATE codigos_autenticacion SET usado_en=NOW() WHERE usuario_id=? AND proposito=? AND usado_en IS NULL', [usuarioId, proposito]);
  await pool.execute('INSERT INTO codigos_autenticacion (id,usuario_id,proposito,codigo_hash,expira_en) VALUES (?,?,?,?,DATE_ADD(NOW(), INTERVAL ? MINUTE))', [randomUUID(), usuarioId, proposito, hashCodigo(valor), proposito === 'verificacion_email' ? 1440 : 15]);
  await enviarCodigoDeAcceso(email, valor, proposito);
}

async function consumirCodigo(email: string, valor: string, proposito: PropositoCorreo): Promise<{ id: string; email: string; nombre: string | null } | null> {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [filas] = await conexion.execute<any[]>('SELECT u.id,u.email,u.nombre,c.id AS codigo_id FROM usuarios u INNER JOIN codigos_autenticacion c ON c.usuario_id=u.id WHERE u.email=? AND c.proposito=? AND c.codigo_hash=? AND c.usado_en IS NULL AND c.expira_en > NOW() ORDER BY c.creado_en DESC LIMIT 1 FOR UPDATE', [email, proposito, hashCodigo(valor)]);
    const usuario = filas[0];
    if (!usuario) { await conexion.rollback(); return null; }
    await conexion.execute('UPDATE codigos_autenticacion SET usado_en=NOW() WHERE id=?', [usuario.codigo_id]);
    await conexion.commit();
    return { id: usuario.id, email: usuario.email, nombre: usuario.nombre };
  } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
}

function hashCodigo(valor: string): string { return createHash('sha256').update(valor).digest('hex'); }
function respuestaDeSesion(usuario: { id: string; email: string; nombre: string | null }): object { return { token: generarToken(usuario.id), usuario }; }
