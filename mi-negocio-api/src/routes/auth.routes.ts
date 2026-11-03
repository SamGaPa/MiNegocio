import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { compararHash, generarHash, generarToken } from '../auth.js';
import { pool } from '../db.js';

const registro = z.object({ email: z.string().trim().email().max(254), contrasena: z.string().min(8).max(72), nombre: z.string().trim().min(1).max(100).optional(), aceptaAvisoPrivacidad: z.literal(true) });
const acceso = z.object({ email: z.string().trim().email().max(254), contrasena: z.string().min(1).max(72) });
export const authRouter = Router();

authRouter.post('/registro', async (req, res, next) => {
  try {
    const datos = registro.parse(req.body);
    const id = randomUUID();
    await pool.execute('INSERT INTO usuarios (id,email,password_hash,nombre,aviso_privacidad_version,consentimiento_fecha) VALUES (?,?,?,?,?,NOW())', [id, datos.email.toLowerCase(), await generarHash(datos.contrasena), datos.nombre ?? null, '1.0']);
    res.status(201).json({ token: generarToken(id), usuario: { id, email: datos.email.toLowerCase(), nombre: datos.nombre ?? null } });
  } catch (error) { next(error); }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const datos = acceso.parse(req.body);
    const [filas] = await pool.execute<any[]>('SELECT id,email,nombre,password_hash FROM usuarios WHERE email = ?', [datos.email.toLowerCase()]);
    const usuario = filas[0];
    if (!usuario || !(await compararHash(datos.contrasena, usuario.password_hash))) { res.status(401).json({ error: 'Correo o contraseña incorrectos.' }); return; }
    res.json({ token: generarToken(usuario.id), usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre } });
  } catch (error) { next(error); }
});
