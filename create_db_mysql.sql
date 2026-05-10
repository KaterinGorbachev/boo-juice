-- ============================================================
-- Boo Juice — MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS boo_juice
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE boo_juice;

-- ============================================================
-- Table: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nickname            VARCHAR(100)    NOT NULL DEFAULT 'Fantasma',
    firebase_uid        VARCHAR(128)    NOT NULL,
    fecha_creacion      DATETIME        NOT NULL,
    fecha_modificacion  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: recetas
-- ============================================================
CREATE TABLE IF NOT EXISTS recetas (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    usuario_id          INT UNSIGNED    NULL,
    nombre_receta       VARCHAR(255)    NOT NULL,
    descripcion         TEXT            NOT NULL DEFAULT ('Nadie podría describir con palabras el sabor de este plato'),
    portada             VARCHAR(500)    NULL,
    video               VARCHAR(500)    NULL,
    tiempo_preparacion  INT             NULL,
    cantidad_porciones  INT             NOT NULL DEFAULT 2,
    fecha_creacion      DATETIME        NOT NULL,
    fecha_modificacion  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_recetas_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: usuarios_recetas_favoritos
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios_recetas_favoritos (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    receta_id           INT UNSIGNED    NOT NULL,
    usuario_id          INT UNSIGNED    NOT NULL,
    fecha_creacion      DATETIME        NOT NULL,
    fecha_modificacion  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_favoritos_receta
        FOREIGN KEY (receta_id) REFERENCES recetas(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_favoritos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: ingredientes
-- ============================================================
CREATE TABLE IF NOT EXISTS ingredientes (
    id                      INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nombre_ingrediente_es   VARCHAR(255)    NOT NULL,
    nombre_ingrediente_en   VARCHAR(255)    NULL,
    protein_G               FLOAT           NULL,
    fat_G                   FLOAT           NULL,
    energy_KCAL             FLOAT           NULL,
    carbohydrate_G          FLOAT           NULL,
    fecha_creacion          DATETIME        NOT NULL,
    fecha_modificacion      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: ingredientes_en_receta
-- ============================================================
CREATE TABLE IF NOT EXISTS ingredientes_en_receta (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    receta_id       INT UNSIGNED    NOT NULL,
    ingrediente_id  INT UNSIGNED    NOT NULL,
    cantidad        FLOAT           NOT NULL DEFAULT 1.0,
    medida          ENUM(
                        'pieza', 'g', 'kg', 'cuchara', 'cucharadita',
                        'taza', 'ml', 'l', 'al gusto', 'pizca'
                    )               NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_ier_receta
        FOREIGN KEY (receta_id) REFERENCES recetas(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ier_ingrediente
        FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: pasos_receta
-- ============================================================
CREATE TABLE IF NOT EXISTS pasos_receta (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    receta_id   INT UNSIGNED    NOT NULL,
    numero_paso INT             NOT NULL,
    descripcion TEXT            NOT NULL,
    imagen      VARCHAR(500)    NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pasos_receta_paso (receta_id, numero_paso),
    CONSTRAINT fk_pasos_receta
        FOREIGN KEY (receta_id) REFERENCES recetas(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: tips_receta
-- ============================================================
CREATE TABLE IF NOT EXISTS tips_receta (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    receta_id   INT UNSIGNED    NOT NULL,
    descripcion TEXT            NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_tips_receta
        FOREIGN KEY (receta_id) REFERENCES recetas(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
