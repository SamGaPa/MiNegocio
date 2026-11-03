import cors from 'cors';
import express from 'express';
import { ZodError } from 'zod';
import { config, origenesPermitidos } from './config.js';
import { comprobarBaseDeDatos } from './db.js';
import { authRouter } from './routes/auth.routes.js';
import { estadoRouter } from './routes/estado.routes.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin(origen, callback) { if (!origen || origenesPermitidos.includes(origen)) callback(null, true); else callback(new Error('Origen no permitido por CORS.')); } }));
app.use(express.json({ limit: '100kb' }));
app.get('/health', async (_req, res, next) => { try { await comprobarBaseDeDatos(); res.json({ estado: 'ok' }); } catch (error) { next(error); } });
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/estado', estadoRouter);
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) { res.status(400).json({ error: 'Datos de entrada inválidos.', detalles: error.issues }); return; }
  const codigo = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: string }).code : undefined;
  if (codigo === 'ER_DUP_ENTRY') { res.status(409).json({ error: 'Ya existe un registro con esos datos.' }); return; }
  console.error(error);
  res.status(500).json({ error: 'Ocurrió un error interno.' });
});

app.listen(config.PORT, () => console.log(`Mi Negocio API disponible en puerto ${config.PORT}`));
