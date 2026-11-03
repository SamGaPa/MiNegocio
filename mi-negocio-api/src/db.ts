import { readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  decimalNumbers: true,
  ssl: { ca: readFileSync(config.DB_SSL_CA_PATH), rejectUnauthorized: true },
});

export async function comprobarBaseDeDatos(): Promise<void> {
  await pool.query('SELECT 1');
}
