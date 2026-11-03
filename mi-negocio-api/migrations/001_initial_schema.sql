CREATE TABLE IF NOT EXISTS usuarios (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NULL,
  aviso_privacidad_version VARCHAR(30) NOT NULL,
  consentimiento_fecha DATETIME NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS productos (
  id CHAR(36) PRIMARY KEY,
  usuario_id CHAR(36) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  stock_inicial INT UNSIGNED NOT NULL,
  stock_minimo INT UNSIGNED NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_productos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT chk_producto_stocks CHECK (stock_inicial >= 0 AND stock_minimo >= 0),
  INDEX idx_productos_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gastos (
  id CHAR(36) PRIMARY KEY,
  usuario_id CHAR(36) NOT NULL,
  fecha DATE NOT NULL,
  concepto VARCHAR(160) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  importe DECIMAL(12,2) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_gastos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT chk_gasto_importe CHECK (importe > 0),
  INDEX idx_gastos_usuario_fecha (usuario_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movimientos (
  id CHAR(36) PRIMARY KEY,
  usuario_id CHAR(36) NOT NULL,
  producto_id CHAR(36) NOT NULL,
  tipo ENUM('entrada', 'salida') NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  motivo VARCHAR(200) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movimientos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_movimientos_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
  CONSTRAINT chk_movimiento_cantidad CHECK (cantidad > 0),
  INDEX idx_movimientos_usuario_producto (usuario_id, producto_id),
  INDEX idx_movimientos_usuario_fecha (usuario_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
