import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config.js';

export interface SolicitudAutenticada extends Request { usuarioId?: string; }

export async function generarHash(contrasena: string): Promise<string> {
  return bcrypt.hash(contrasena, 12);
}
export async function compararHash(contrasena: string, hash: string): Promise<boolean> {
  return bcrypt.compare(contrasena, hash);
}
export function generarToken(usuarioId: string): string {
  return jwt.sign({ sub: usuarioId }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'] });
}
export function requerirAutenticacion(req: SolicitudAutenticada, res: Response, next: NextFunction): void {
  const [tipo, token] = req.header('authorization')?.split(' ') ?? [];
  if (tipo !== 'Bearer' || !token) { res.status(401).json({ error: 'Se requiere iniciar sesión.' }); return; }
  try {
    const datos = jwt.verify(token, config.JWT_SECRET);
    if (typeof datos === 'string' || typeof datos.sub !== 'string') throw new Error('Token inválido');
    req.usuarioId = datos.sub;
    next();
  } catch { res.status(401).json({ error: 'La sesión no es válida o expiró.' }); }
}
