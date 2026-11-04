ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT FALSE AFTER nombre;

-- Las cuentas creadas antes de esta funcionalidad conservan acceso; las nuevas deben verificarse.
UPDATE usuarios SET email_verificado = TRUE WHERE email_verificado = FALSE;

CREATE TABLE IF NOT EXISTS codigos_autenticacion (
  id CHAR(36) PRIMARY KEY,
  usuario_id CHAR(36) NOT NULL,
  proposito ENUM('verificacion_email', 'recuperacion_contrasena') NOT NULL,
  codigo_hash CHAR(64) NOT NULL,
  expira_en DATETIME NOT NULL,
  usado_en DATETIME NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_codigos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_codigos_busqueda (usuario_id, proposito, usado_en, expira_en),
  INDEX idx_codigos_creado (usuario_id, proposito, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
