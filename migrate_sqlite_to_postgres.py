"""
Migrates all data from recetas.db (SQLite) to PostgreSQL.

Usage:
    python migrate_sqlite_to_postgres.py

Requirements:
    - DATABASE_URL set in .env  (postgresql://user:pass@host:5432/dbname)
    - PostgreSQL tables already created (run sqlite_create_db.py first)
    - recetas.db present in the same directory
"""

import sqlite3
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

SQLITE_DB = "recetas.db"
DATABASE_URL = os.getenv("DATABASE_URL")

TABLES = [
    "usuarios",
    "ingredientes",
    "recetas",
    "usuarios_recetas_favoritos",
    "ingredientes_en_receta",
    "pasos_receta",
    "tips_receta",
]


def get_sqlite_rows(sqlite_conn, table):
    sqlite_conn.row_factory = sqlite3.Row
    cur = sqlite_conn.cursor()
    cur.execute(f"SELECT * FROM {table}")
    return [dict(row) for row in cur.fetchall()]


def get_columns(sqlite_conn, table):
    cur = sqlite_conn.cursor()
    cur.execute(f"PRAGMA table_info({table})")
    return [row[1] for row in cur.fetchall()]


def truncate_all(pg_conn):
    """Wipe all tables so re-running the script always starts clean."""
    cur = pg_conn.cursor()
    cur.execute(
        "TRUNCATE TABLE tips_receta, pasos_receta, ingredientes_en_receta, "
        "usuarios_recetas_favoritos, recetas, ingredientes, usuarios "
        "RESTART IDENTITY CASCADE;"
    )
    print("Cleared existing data from all tables.\n")


def insert_rows(pg_conn, table, columns, rows):
    if not rows:
        print(f"  {table}: no rows, skipping.")
        return

    cur = pg_conn.cursor()
    placeholders = ", ".join(["%s"] * len(columns))
    col_names = ", ".join(columns)
    sql = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders})"

    inserted = skipped = 0
    for row in rows:
        values = tuple(None if row[col] == "" else row[col] for col in columns)
        cur.execute("SAVEPOINT row_insert")
        try:
            cur.execute(sql, values)
            cur.execute("RELEASE SAVEPOINT row_insert")
            inserted += 1
        except psycopg2.errors.ForeignKeyViolation:
            cur.execute("ROLLBACK TO SAVEPOINT row_insert")
            skipped += 1

    suffix = f", {skipped} orphaned rows skipped" if skipped else ""
    print(f"  {table}: {inserted} rows inserted{suffix}.")


def reset_sequence(pg_conn, table):
    """After bulk-inserting with explicit IDs, advance the SERIAL sequence."""
    cur = pg_conn.cursor()
    cur.execute(f"""  # Se ejecuta la función setval de PostgreSQL para avanzar la secuencia al valor máximo de id presente en la tabla
        SELECT setval(
            pg_get_serial_sequence('{table}', 'id'),
            COALESCE((SELECT MAX(id) FROM {table}), 0) + 1,
            false
        )
    """)  # La función COALESCE garantiza un valor base de 1 cuando la tabla está vacía; el parámetro false indica que el próximo valor generado será exactamente el especificado


def main():
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL is not set in .env")
        return

    print(f"Connecting to SQLite: {SQLITE_DB}")
    sqlite_conn = sqlite3.connect(SQLITE_DB)

    print(f"Connecting to PostgreSQL...")
    pg_conn = psycopg2.connect(DATABASE_URL)

    try:
        truncate_all(pg_conn)
        print("Migrating tables...\n")
        for table in TABLES:
            columns = get_columns(sqlite_conn, table)
            rows = get_sqlite_rows(sqlite_conn, table)
            insert_rows(pg_conn, table, columns, rows)
            reset_sequence(pg_conn, table)

        pg_conn.commit()
        print("\nDone. All data migrated successfully.")

    except Exception as e:
        pg_conn.rollback()
        print(f"\nERROR: {e}")
        raise

    finally:
        sqlite_conn.close()
        pg_conn.close()


if __name__ == "__main__":
    main()
