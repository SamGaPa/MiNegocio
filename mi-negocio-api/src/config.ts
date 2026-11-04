import 'dotenv/config';
import { z } from 'zod';

const esquema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGINS: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive(),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_SSL_CA_PATH: z.string().min(1),
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  EMAIL_FROM: z.string().min(3).optional(),
});

export const config = esquema.parse(process.env);
export const origenesPermitidos = config.CORS_ORIGINS.split(',').map((origen) => origen.trim()).filter(Boolean);
