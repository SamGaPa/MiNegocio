import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pool } from '../db.js';

async function migrar(): Promise<void> {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (nombre VARCHAR(255) PRIMARY KEY, aplicado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  const directorio = join(process.cwd(), 'migrations');
  const archivos = (await readdir(directorio)).filter((archivo) => archivo.endsWith('.sql')).sort();
  const [aplicadas] = await pool.query<any[]>('SELECT nombre FROM schema_migrations');
  const yaAplicadas = new Set(aplicadas.map((fila) => fila.nombre));
  for (const archivo of archivos) {
    if (yaAplicadas.has(archivo)) continue;
    const sql = await readFile(join(directorio, archivo), 'utf8');
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      for (const sentencia of sql.split(';').map((item) => item.trim()).filter(Boolean)) await conexion.query(sentencia);
      await conexion.execute('INSERT INTO schema_migrations (nombre) VALUES (?)', [archivo]);
      await conexion.commit();
      console.log(`Migración aplicada: ${archivo}`);
    } catch (error) { await conexion.rollback(); throw error; } finally { conexion.release(); }
  }
  await pool.end();
}

migrar().catch((error) => { console.error('No se pudieron aplicar las migraciones. Revisa .env y el certificado CA.'); console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
