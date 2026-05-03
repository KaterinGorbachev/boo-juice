import sqlite3
import logging
from contextlib import contextmanager
from datetime import datetime, timezone
from calories_calculator import calories_json
import re

# -------------------------
# Loggers
# -------------------------
def makeLogger(): 
    '''prepare console and file handlers'''
    logger = logging.getLogger(__name__)
    logger.setLevel('DEBUG')
    return logger

###------------------------------------

def formatLoggs(): 
    return logging.Formatter('{asctime} - {name} - {message}', datefmt='%d/%m/%Y %I:%M:%S %p', style='{')

###------------------------------------

def getConsoleLogger(logger): 
    console_handler = logging.StreamHandler()
    console_handler.setLevel('DEBUG')
    console_handler.setFormatter(formatLoggs())
    logger.addHandler(console_handler)

###------------------------------------

def getFileLogger(logger): 
    file_handler = logging.FileHandler('access.log', mode='a', encoding='utf-8')
    file_handler.setLevel('INFO')
    file_handler.setFormatter(formatLoggs())
    logger.addHandler(file_handler)


### Set loggs
logger = makeLogger()
getConsoleLogger(logger)

# -------------------------
# Connection helpers
# -------------------------
def create_connection(db_name: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_name)
    logger.debug('Conexión con DB establecida de forma correcta')
    return conn


def enable_foreign_keys(conn: sqlite3.Connection) -> None:
    conn.execute("PRAGMA foreign_keys = ON;")


def close_connection(conn):
    conn.close()
    logger.debug('Conexion con DB finalizada de forma correcta.')


@contextmanager
def get_connection(db_name: str):
    """Context manager — always closes the connection, even on exception or early return."""
    conn = create_connection(db_name)
    try:
        yield conn
    finally:
        close_connection(conn)


def make_dicts(cursor, row):
    return dict((cursor.description[idx][0], value)
                for idx, value in enumerate(row))


# -------------------------
# INSERT 
# -------------------------
def insert_usuario(conn, firebase_uid, nickname=''):
    cursor = conn.cursor()
    data = datetime.now(timezone.utc)
    sql = """
        INSERT INTO usuarios (nickname, firebase_uid, fecha_creacion)
        VALUES (?, ?, ?);
    """
    cursor.execute(sql, (nickname, firebase_uid, data))

    conn.commit()
    logger.debug('Datos insertados de forma correcta')
    #lets you link inserted rows correctly
    return cursor.lastrowid


def insert_receta(conn, usuario_id, nombre_receta, descripcion, tiempo_preparacion, cantidad_porciones, portada='', video=''):
    cursor = conn.cursor()
    data = datetime.now(timezone.utc)
    cursor.execute("""
        INSERT INTO recetas (
            usuario_id,
            nombre_receta,
            descripcion,
            portada, 
            video,
            tiempo_preparacion,
            cantidad_porciones, 
            fecha_creacion
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        usuario_id,
        nombre_receta, 
        descripcion, 
        portada, 
        video, 
        tiempo_preparacion,
        cantidad_porciones, 
        data
        
    ))

    conn.commit()
    logger.debug('Datos insertados de forma correcta')
    return cursor.lastrowid


def insert_ingrediente(conn, nombre_ingrediente_es, nombre_ingrediente_en, proteina, fat, energy, carb ):
    cursor = conn.cursor()
    data = datetime.now(timezone.utc)
    cursor.execute("""
        INSERT INTO ingredientes (
            nombre_ingrediente_es,
            nombre_ingrediente_en,  
            protein_G, 
            fat_G, 
            energy_KCAL,
            carbohydrate_G,      
            fecha_creacion
        )
        VALUES (?, ?, ?, ?, ?, ?, ?);
    """, (nombre_ingrediente_es, nombre_ingrediente_en, proteina, fat, energy, carb, data))

    
    conn.commit()
    logger.debug('Datos insertados de forma correcta')
    return cursor.lastrowid







def insert_ingrediente_en_receta(conn, receta_id, ingrediente_id, cantidad, medida):
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO ingredientes_en_receta (
            receta_id,
            ingrediente_id,
            cantidad, 
            medida
        )
        VALUES (?, ?, ?, ?);
    """, (receta_id, ingrediente_id, cantidad, medida))

    conn.commit()
    logger.debug('Datos insertados de forma correcta')


def insert_paso(conn, receta_id, numero_paso, descripcion):
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO pasos_receta (
            receta_id,
            numero_paso,
            descripcion
        )
        VALUES (?, ?, ?);
    """, (receta_id, numero_paso, descripcion))


    conn.commit()
    logger.debug('Datos insertados de forma correcta')


def insert_tip(conn, receta_id, descripcion):
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tips_receta (receta_id, descripcion)
        VALUES (?, ?);
    """, (receta_id, descripcion))

    conn.commit()
    logger.debug('Datos insertados de forma correcta')


def insert_usuarios_recetas_favoritos(conn, receta_id, usuario_id, fecha_modificacion): 
    cursor = conn.cursor()
    data = datetime.now(timezone.utc)
    cursor.execute("""
        INSERT INTO usuarios_recetas_favoritos (receta_id, usuario_id, fecha_creacion, fecha_modificacion)
        VALUES (?, ?, ?, ?);
    """, (receta_id, usuario_id, data, fecha_modificacion))
    conn.commit()
    logger.debug('Datos insertados de forma correcta')




# -------------------------
# UPDATE 
# -------------------------
def update_usuario(conn, usuario_id, newNickname):
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE usuarios
        SET nickname = ?
        WHERE id = ?;
    """, (newNickname, usuario_id))

    conn.commit()
    logger.debug('Datos actualizados de forma correcta')


# -------------------------
def update_receta(conn, receta_id, nombre_receta, descripcion, portada, video, tiempo_preparacion, cantidad_porciones):
    cursor = conn.cursor()
    if portada is not None:
        cursor.execute("""
            UPDATE recetas
            SET nombre_receta = ?, descripcion = ?, portada = ?, video = ?, tiempo_preparacion = ?, cantidad_porciones = ?, fecha_modificacion = CURRENT_TIMESTAMP
            WHERE id = ?;
        """, (nombre_receta, descripcion, portada, video, tiempo_preparacion, cantidad_porciones, receta_id))
    else:
        cursor.execute("""
            UPDATE recetas
            SET nombre_receta = ?, descripcion = ?, video = ?, tiempo_preparacion = ?, cantidad_porciones = ?, fecha_modificacion = CURRENT_TIMESTAMP
            WHERE id = ?;
        """, (nombre_receta, descripcion, video, tiempo_preparacion, cantidad_porciones, receta_id))

    conn.commit()
    logger.debug('Receta actualizada de forma correcta')


def update_ingredientes_receta(conn, receta_id, ingredientes):
    # First delete existing ingredients
    cursor = conn.cursor()
    cursor.execute("DELETE FROM ingredientes_en_receta WHERE receta_id = ?", (receta_id,))

    # Insert new ingredients
    for ingrediente in ingredientes:
        # Check if ingredient exists, if not create it
        cursor.execute("SELECT id FROM ingredientes WHERE nombre_ingrediente_es = ?", (ingrediente['nombre'],))
        result = cursor.fetchone()

        if result:
            ingrediente_id = result[0]
        else:
            # Insert new ingredient
            cursor.execute("""
                INSERT INTO ingredientes (nombre_ingrediente_es, fecha_creacion, fecha_modificacion)
                VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (ingrediente['nombre'],))
            ingrediente_id = cursor.lastrowid

        # Insert into ingredientes_en_receta
        cursor.execute("""
            INSERT INTO ingredientes_en_receta (receta_id, ingrediente_id, cantidad, medida)
            VALUES (?, ?, ?, ?)
        """, (receta_id, ingrediente_id, ingrediente['cantidad'], ingrediente['medida']))

    conn.commit()
    logger.debug('Ingredientes de receta actualizados de forma correcta')


def update_pasos_receta(conn, receta_id, pasos):
    # First delete existing steps
    cursor = conn.cursor()
    cursor.execute("DELETE FROM pasos_receta WHERE receta_id = ?", (receta_id,))

    # Insert new steps
    for i in range(len(pasos)):
        cursor.execute("""
            INSERT INTO pasos_receta (receta_id, numero_paso, descripcion)
            VALUES (?, ?, ?)
        """, (receta_id, i+1, pasos[i]))

    conn.commit()
    logger.debug('Pasos de receta actualizados de forma correcta')


def update_tips_receta(conn, receta_id, tips):
    # First delete existing tips
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tips_receta WHERE receta_id = ?", (receta_id,))

    # Insert new tips
    for tip in tips:
        cursor.execute("""
            INSERT INTO tips_receta (receta_id, descripcion)
            VALUES (?, ?)
        """, (receta_id, tip))

    conn.commit()
    logger.debug('Tips de receta actualizados de forma correcta')


# -------------------------
# DELETE 
# -------------------------
def delete_ingrediente(conn, ingrediente_id):
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM ingredientes
        WHERE id = ?;
    """, (ingrediente_id,))

    conn.commit()
    logger.debug('Datos eliminados de forma correcta')


def delete_receta(conn, receta_id):
    """
    This will automatically delete:
    - ingredientes
    - pasos_receta
    - tips_receta
    because of ON DELETE CASCADE
    """
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM recetas
        WHERE id = ?;
    """, (receta_id,))

    conn.commit()
    logger.debug('Datos eliminados de forma correcta')



ALLOWED_TABLES = {
    'recetas',
    'usuarios',
    'ingredientes',
    'ingredientes_en_receta',
    'pasos_receta',
    'tips_receta',
    'usuarios_recetas_favoritos',
}

def delete_item(table_name, item_id, conn):
    """Delete a row by ID from the specified table."""
    if table_name not in ALLOWED_TABLES:
        raise ValueError(f"Table '{table_name}' is not allowed")
    cursor = conn.cursor()
    cursor.execute(f"DELETE FROM {table_name} WHERE id = ?", (item_id,))
    conn.commit()


# -------------------------
# GET 
# -------------------------

def get_all_items(table_name, conn):
    """Fetch all rows from the specified table as a list of dicts."""
    if table_name not in ALLOWED_TABLES:
        raise ValueError(f"Table '{table_name}' is not allowed")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    return [dict(row) for row in rows]



## return only id 
def get_usuario_by_firebase_uid(conn, firebase_uid):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM usuarios
        WHERE firebase_uid = ?;
    """, (firebase_uid,))

    row = cursor.fetchone()
    return row[0] if row else None


def check_receta_in_favoritos(conn, receta_id, user_id): 
    conn.row_factory = make_dicts
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM usuarios_recetas_favoritos WHERE receta_id = ? AND usuario_id = ?;
    """, (receta_id, user_id))
    recetas = cursor.fetchall()
    return True if recetas else False




def get_user_liked_recepies_info(conn, id):
    conn.row_factory = make_dicts
    cursor = conn.cursor()

    
    cursor.execute("""
        SELECT r.* FROM recetas r
        LEFT JOIN usuarios_recetas_favoritos urf ON r.id = urf.receta_id
        WHERE urf.usuario_id = ?;
    """, (id,))
    recetas = cursor.fetchall()

    for receta in recetas:
        rid = receta["id"]

        cursor.execute("""
            SELECT i.nombre_ingrediente_es, ier.cantidad, ier.medida
            FROM ingredientes_en_receta ier
            LEFT JOIN ingredientes i ON ier.ingrediente_id = i.id
            WHERE ier.receta_id = ?;
        """, (rid,))
        receta["ingredientes"] = cursor.fetchall()

        cursor.execute("""
            SELECT numero_paso, descripcion, imagen
            FROM pasos_receta
            WHERE receta_id = ?
            ORDER BY numero_paso;
        """, (rid,))
        receta["pasos"] = cursor.fetchall()

        cursor.execute("""
            SELECT descripcion FROM tips_receta WHERE receta_id = ?;
        """, (rid,))
        receta["tips"] = cursor.fetchall()

    return recetas




def get_user_shared_recepies_info(conn, id):
    conn.row_factory = make_dicts
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM recetas WHERE usuario_id = ?;", (id,))
    recetas = cursor.fetchall()

    for receta in recetas:
        rid = receta["id"]

        cursor.execute("""
            SELECT i.nombre_ingrediente_es, ier.cantidad, ier.medida
            FROM ingredientes_en_receta ier
            LEFT JOIN ingredientes i ON ier.ingrediente_id = i.id
            WHERE ier.receta_id = ?;
        """, (rid,))
        receta["ingredientes"] = cursor.fetchall()

        cursor.execute("""
            SELECT numero_paso, descripcion, imagen
            FROM pasos_receta
            WHERE receta_id = ?
            ORDER BY numero_paso;
        """, (rid,))
        receta["pasos"] = cursor.fetchall()

        cursor.execute("""
            SELECT descripcion FROM tips_receta WHERE receta_id = ?;
        """, (rid,))
        receta["tips"] = cursor.fetchall()

    return recetas


def get_all_recepies_info(conn):
    conn.row_factory = make_dicts
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM recetas;")
    return cursor.fetchall()


def get_recepies_page(conn, limit, offset):
    conn.row_factory = make_dicts
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM recetas ORDER BY id DESC LIMIT ? OFFSET ?;",
        (limit, offset)
    )
    recetas = cursor.fetchall()
    cursor.execute("SELECT COUNT(*) FROM recetas;")
    total = cursor.fetchone()["COUNT(*)"]
    return recetas, total


def get_receta_by_id(rid, conn): 
    conn.row_factory = make_dicts
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM recetas WHERE id = ?;",
             (rid,))
    receta = cursor.fetchone()
    
    if not receta:
        return None

    cursor.execute("""
        SELECT 
            i.id AS ingrediente_id,
            i.nombre_ingrediente_es,
            i.nombre_ingrediente_en,
            i.protein_G,
            i.fat_G,
            i.energy_KCAL,
            i.carbohydrate_G,
            ir.cantidad,
            ir.medida
        FROM ingredientes_en_receta ir
        LEFT JOIN ingredientes i 
            ON ir.ingrediente_id = i.id
        WHERE ir.receta_id = ?;
    """, (rid,))
    
    receta["ingredientes"] = cursor.fetchall()

    cursor.execute(
        """
             SELECT numero_paso, descripcion, imagen
             FROM pasos_receta
             WHERE receta_id = ?
             ORDER BY numero_paso;
             """,
             (rid,)
         )
    receta["pasos"] = cursor.fetchall()

    cursor.execute(
             "SELECT descripcion FROM tips_receta WHERE receta_id = ?;",
             (rid,)
         )
    receta["tips"] = cursor.fetchall()

    return receta


def get_ingrediente(conn, nombre):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM ingredientes
        WHERE nombre_ingrediente_es = ? OR nombre_ingrediente_en = ? ;
    """, (nombre, nombre))

    row = cursor.fetchone()
    return row[0] if row else None


def get_all_ingredientes(conn):
    conn.row_factory = make_dicts
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, nombre_ingrediente_es FROM ingredientes;
    """)

    ingredientes = cursor.fetchall()

    return ingredientes



    




def test(): 

    conn = create_connection('recetas.db')
    enable_foreign_keys(conn)
    print(get_all_recepies_info(conn))
    conn.close()



if __name__ == "__main__":
    test()
