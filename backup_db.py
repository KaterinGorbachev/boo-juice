"""
Exports all PostgreSQL tables to JSON and CSV files.

Usage:
    python backup_db.py           # exports both JSON and CSV
    python backup_db.py json      # exports JSON only
    python backup_db.py csv       # exports CSV only

Output:
    backups/YYYY-MM-DD_HH-MM-SS/
        usuarios.json
        recetas.json
        ...
        usuarios.csv
        recetas.csv
        ...
"""

import psycopg2
import psycopg2.extras
import os
import json
import csv
import sys
from datetime import datetime, date
from dotenv import load_dotenv

load_dotenv()

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


def fetch_table(conn, table):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(f"SELECT * FROM {table}")
    return [dict(row) for row in cur.fetchall()]


def serialize(value):
    """Make non-JSON-serializable types (dates, decimals) into strings."""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def export_json(rows, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(
            [{k: serialize(v) for k, v in row.items()} for row in rows],
            f,
            ensure_ascii=False,
            indent=2,
        )


def export_csv(rows, path):
    if not rows:
        open(path, "w").close()
        return
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        for row in rows:
            writer.writerow({k: serialize(v) for k, v in row.items()})


def main():
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL is not set in .env")
        return

    mode = sys.argv[1].lower() if len(sys.argv) > 1 else "both"
    if mode not in ("json", "csv", "both"):
        print(f"Unknown mode '{mode}'. Use: json, csv, or both.")
        return

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_dir = os.path.join("backups", timestamp)
    os.makedirs(backup_dir, exist_ok=True)

    print(f"Connecting to PostgreSQL...")
    conn = psycopg2.connect(DATABASE_URL)

    try:
        total_rows = 0
        for table in TABLES:
            rows = fetch_table(conn, table)
            total_rows += len(rows)

            if mode in ("json", "both"):
                path = os.path.join(backup_dir, f"{table}.json")
                export_json(rows, path)

            if mode in ("csv", "both"):
                path = os.path.join(backup_dir, f"{table}.csv")
                export_csv(rows, path)

            print(f"  {table}: {len(rows)} rows")

        print(f"\nBackup saved to: {backup_dir}")
        print(f"Total rows exported: {total_rows}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
