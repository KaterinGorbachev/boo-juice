import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def create_connection():
    try:
        database_url = os.getenv("DATABASE_URL")
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        print("Error connecting to database:", e)
        return None


def create_tables(conn) -> None:
    """
    Creates all database tables.
    Existing tables are dropped first (with CASCADE) to allow clean recreation.
    """
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS usuarios CASCADE;")

    cursor.execute("""
    CREATE TABLE usuarios (
        id SERIAL PRIMARY KEY,
        nickname TEXT DEFAULT 'Fantasma',
        firebase_uid TEXT NOT NULL,
        fecha_creacion TIMESTAMPTZ NOT NULL,
        fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("DROP TABLE IF EXISTS recetas CASCADE;")

    cursor.execute("""
    CREATE TABLE recetas (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NULL,
        nombre_receta TEXT NOT NULL,
        descripcion TEXT NOT NULL
            DEFAULT 'Nadie podría describir con palabras el sabor de este plato',
        portada TEXT,
        video TEXT,
        tiempo_preparacion INTEGER,
        cantidad_porciones INTEGER NOT NULL DEFAULT 2,
        fecha_creacion TIMESTAMPTZ NOT NULL,
        fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id)
            REFERENCES usuarios(id)
            ON DELETE SET NULL
    );
    """)

    cursor.execute("DROP TABLE IF EXISTS usuarios_recetas_favoritos CASCADE;")

    cursor.execute("""
    CREATE TABLE usuarios_recetas_favoritos (
        id SERIAL PRIMARY KEY,
        receta_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL,
        fecha_creacion TIMESTAMPTZ NOT NULL,
        fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (receta_id)
            REFERENCES recetas(id)
            ON DELETE CASCADE,
        FOREIGN KEY (usuario_id)
            REFERENCES usuarios(id)
            ON DELETE CASCADE
    );
    """)

    cursor.execute("DROP TABLE IF EXISTS ingredientes CASCADE;")

    cursor.execute("""
    CREATE TABLE ingredientes (
        id SERIAL PRIMARY KEY,
        nombre_ingrediente_es TEXT NOT NULL,
        nombre_ingrediente_en TEXT,
        protein_G REAL,
        fat_G REAL,
        energy_KCAL REAL,
        carbohydrate_G REAL,
        fecha_creacion TIMESTAMPTZ NOT NULL,
        fecha_modificacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("DROP TABLE IF EXISTS ingredientes_en_receta CASCADE;")

    cursor.execute("""
    CREATE TABLE ingredientes_en_receta (
        id SERIAL PRIMARY KEY,
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

    cursor.execute("DROP TABLE IF EXISTS pasos_receta CASCADE;")

    cursor.execute("""
    CREATE TABLE pasos_receta (
        id SERIAL PRIMARY KEY,
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

    cursor.execute("DROP TABLE IF EXISTS tips_receta CASCADE;")

    cursor.execute("""
    CREATE TABLE tips_receta (
        id SERIAL PRIMARY KEY,
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
    - Creates all tables
    """
    conn = create_connection()
    create_tables(conn)
    conn.close()
    print("PostgreSQL database tables created successfully.")


if __name__ == "__main__":
    main()
