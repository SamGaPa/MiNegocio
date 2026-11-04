# Mi Negocio API

API Express + TypeScript + MySQL para datos por usuario.

## Configuración local

1. Copia `.env.example` como `.env`.
2. En Aiven, abre el servicio MySQL y copia `Host`, `Port`, `User`, `Password` y `Database` desde **Connection information**.
3. Descarga **CA Certificate** y guárdalo como `certs/ca.pem`. Este archivo y `.env` no se suben a Git.
4. Cambia `JWT_SECRET` por una cadena aleatoria de al menos 32 caracteres.
5. Instala dependencias: `npm install`.
6. Ejecuta las tablas: `npm run migrate`.
7. Inicia la API: `npm run dev`.

## Correo transaccional con Resend

Configura en el servidor `RESEND_API_KEY` con una clave de tipo **Sending access** y `EMAIL_FROM` con un remitente autorizado por Resend. Estas variables nunca van en Ionic ni en Git.

La migración `002_email_verification_and_recovery.sql` agrega la verificación de correo y una tabla de códigos de un solo uso. Ejecuta `npm run migrate` antes de desplegar una versión que use estas rutas. Los códigos se almacenan como hash; los de verificación vencen en 24 horas y los de recuperación en 15 minutos.

La API escucha por defecto en `http://localhost:3000`. El celular no debe conectarse directamente a MySQL; más adelante se configurará una URL HTTPS pública para esta API.

## Rutas iniciales

- `POST /api/v1/auth/registro`: crea usuario, guarda hash bcrypt y registra consentimiento del aviso de privacidad.
- `POST /api/v1/auth/login`: devuelve un JWT temporal.
- `POST /api/v1/auth/verificacion/solicitar` y `/confirmar`: reenvía o confirma el correo con un código temporal.
- `POST /api/v1/auth/recuperacion/solicitar` y `/confirmar`: permite restablecer la contraseña con un código temporal.
- `GET /api/v1/estado`: devuelve productos, gastos y movimientos del usuario del JWT.
- `POST /api/v1/estado/productos`, `/gastos`, `/movimientos`: registra información para el usuario autenticado.
- `PATCH /api/v1/estado/productos/:id`: actualiza nombre, categoría, mínimo y estado activo de un producto; el stock inicial no se modifica.
- `PATCH` y `DELETE /api/v1/estado/gastos/:id`: actualiza o elimina un gasto de la cuenta autenticada.
- `GET /health`: comprueba API y conexión a la base de datos.

Para las rutas de estado usa `Authorization: Bearer <token>`. Nunca conectes Ionic directamente a MySQL ni copies estas variables al frontend.
