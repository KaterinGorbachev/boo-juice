import sqlite3




def create_connection(db_name: str) -> sqlite3.Connection:
    """
    Creates and returns a connection to the SQLite database.
    If the database file does not exist, it will be created.
    """
    conn = sqlite3.connect(db_name)
    return conn


def enable_foreign_keys(conn: sqlite3.Connection) -> None:
    """
    Enables foreign key support in SQLite.
    IMPORTANT: SQLite disables foreign keys by default.
    """
    conn.execute("PRAGMA foreign_keys = ON;")


def create_tables(conn: sqlite3.Connection) -> None:
    """
    Creates all database tables.
    Existing tables are dropped first to allow clean recreation.
    """
    cursor = conn.cursor()

    # =========================
    # Tabla usuarios
    # =========================
    cursor.execute("""
    DROP TABLE IF EXISTS usuarios;
    """)

    cursor.execute("""
    CREATE TABLE usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT DEFAULT 'Fantasma',
        firebase_uid TEXT NOT NULL,
        fecha_creacion DATETIME NOT NULL, 
        fecha_modificacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    """)

    

    # =========================
    # Tabla recetas
    # =========================
    cursor.execute("""
    DROP TABLE IF EXISTS recetas;
    """)

    cursor.execute("""
    CREATE TABLE recetas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NULL,
        nombre_receta TEXT NOT NULL,
        descripcion TEXT NOT NULL 
            DEFAULT 'Nadie podría describir con palabras el sabor de este plato',
        portada TEXT,
        video TEXT,
        tiempo_preparacion INTEGER,
        cantidad_porciones INTEGER NOT NULL DEFAULT 2,
        fecha_creacion DATETIME NOT NULL,
        fecha_modificacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id)
            REFERENCES usuarios(id)
            ON DELETE SET NULL
    );
    """)



    cursor.execute("""
    DROP TABLE IF EXISTS usuarios_recetas_favoritos;
    """)

    cursor.execute("""
    CREATE TABLE usuarios_recetas_favoritos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receta_id INTEGER NOT NULL, 
        usuario_id INTEGER NOT NULL,
        fecha_creacion DATETIME NOT NULL, 
        fecha_modificacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (receta_id)
            REFERENCES recetas(id)
            ON DELETE CASCADE, 
        FOREIGN KEY (usuario_id)
            REFERENCES usuarios(id)
            ON DELETE CASCADE
        
    );
    """)


    # =========================
    # Tabla ingredientes
    # =========================
    cursor.execute("""
    DROP TABLE IF EXISTS ingredientes;
    """)
 ## with nutrition facts
    cursor.execute("""
    CREATE TABLE ingredientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_ingrediente_es TEXT NOT NULL,
        nombre_ingrediente_en TEXT,  
        protein_G REAL, 
        fat_G REAL, 
        energy_KCAL REAL,
        carbohydrate_G REAL, 
        fecha_creacion DATETIME NOT NULL,
        fecha_modificacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP  
        
              
    );
    """)

   

    cursor.execute("""
    DROP TABLE IF EXISTS ingredientes_en_receta;
    """)

    cursor.execute("""
    CREATE TABLE ingredientes_en_receta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receta_id INTEGER NOT NULL,
        ingrediente_id INTEGER NOT NULL,         
        cantidad REAL NOT NULL DEFAULT 1.0,
        medida TEXT NOT NULL CHECK (
            medida IN (
                'pieza', 'g', 'kg', 'cuchara', 'cucharadita',
                'taza', 'ml', 'l', 'al gusto', 'pizca'
            )
        ),
        FOREIGN KEY (receta_id)
            REFERENCES recetas(id)
            ON DELETE CASCADE, 
        FOREIGN KEY (ingrediente_id)
            REFERENCES ingredientes(id)
            ON DELETE CASCADE
    );
    """)

    # =========================
    # Tabla pasos de la receta
    # =========================
    cursor.execute("""
    DROP TABLE IF EXISTS pasos_receta;
    """)

    cursor.execute("""
    CREATE TABLE pasos_receta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receta_id INTEGER NOT NULL,
        numero_paso INTEGER NOT NULL,
        descripcion TEXT NOT NULL,
        imagen TEXT,
        FOREIGN KEY (receta_id)
            REFERENCES recetas(id)
            ON DELETE CASCADE,
        UNIQUE (receta_id, numero_paso)
    );
    """)

    # =========================
    # Tabla tips de receta
    # =========================
    cursor.execute("""
    DROP TABLE IF EXISTS tips_receta;
    """)

    cursor.execute("""
    CREATE TABLE tips_receta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receta_id INTEGER NOT NULL,
        descripcion TEXT NOT NULL,
        FOREIGN KEY (receta_id)
            REFERENCES recetas(id)
            ON DELETE CASCADE
    );
    """)

    conn.commit()


def main():
    """
    Main entry point:
    - Creates the database connection
    - Enables foreign keys
    - Creates all tables
    """
    db_name = "recetas.db"

    conn = create_connection(db_name)
    enable_foreign_keys(conn)
    create_tables(conn)

    conn.close()
    print("✅ SQLite database 'recetas.db' created successfully.")


if __name__ == "__main__":
    main()
