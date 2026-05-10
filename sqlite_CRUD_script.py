import psycopg2  
import psycopg2.extras  
import os  
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


logger = makeLogger()
getConsoleLogger(logger)

DATABASE_URL = os.getenv("DATABASE_URL")

# -------------------------
# Connection helpers
# -------------------------
def create_connection():
    conn = psycopg2.connect(DATABASE_URL)
    logger.debug('Conexión con DB establecida de forma correcta')
    return conn


def close_connection(conn):
    conn.close()
    logger.debug('Conexion con DB finalizada de forma correcta.')


@contextmanager
def get_connection():
    """Context manager — commits on success, rolls back on exception, always closes."""
    conn = create_connection()
    try:
        yield conn
        conn.commit()
    except:
        conn.rollback()
        raise
    finally:
        close_connection(conn)


# -------------------------
# INSERT
# -------------------------
def insert_usuario(conn, firebase_uid, nickname=''):
    cursor = conn.cursor()
    data = datetime.now(timezone.utc)
    sql = """  # Se define la sentencia SQL parametrizada de inserción de usuario que incluye la cláusula RETURNING para recuperar el identificador generado
        INSERT INTO usuarios (nickname, firebase_uid, fecha_creacion)
        VALUES (%s, %s, %s) RETURNING id;
    """
    cursor.execute(sql, (nickname, firebase_uid, data))
    logger.debug('Datos insertados de forma correcta')
    return cursor.fetchone()[0]


def insert_receta(conn, usuario_id, nombre_receta, descripcion, tiempo_preparacion, cantidad_porciones, portada='', video=''):
    cursor = conn.cursor()
    data = datetime.now(timezone.utc)
    cursor.execute("""  # Se ejecuta la sentencia INSERT parametrizada para crear un nuevo registro de receta en la base de datos
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
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;
    """, (  # Se pasa la tupla de valores como segundo argumento de cursor.execute para la sustitución parametrizada segura de cada marcador de posición en la sentencia SQL
        usuario_id,
        nombre_receta,
        descripcion,
        portada,
        video,
        tiempo_preparacion,
        cantidad_porciones,
        data
    ))
    logger.debug('Datos insertados de forma correcta')
    return cursor.fetchone()[0]


def insert_ingrediente(conn, nombre_ingrediente_es, nombre_ingrediente_en, proteina, fat, energy, carb):
    cursor = conn.cursor()
    data = datetime.now(timezone.utc)
    cursor.execute("""  # Se ejecuta la sentencia INSERT parametrizada para añadir un nuevo ingrediente con sus datos nutricionales al catálogo de la base de datos
        INSERT INTO ingredientes (
            nombre_ingrediente_es,
            nombre_ingrediente_en,
            protein_G,
            fat_G,
            energy_KCAL,
            carbohydrate_G,
            fecha_creacion
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id;
    """, (nombre_ingrediente_es, nombre_ingrediente_en, proteina, fat, energy, carb, data))  # Se pasan los valores del ingrediente como tupla parametrizada para garantizar la seguridad de la operación de inserción
    logger.debug('Datos insertados de forma correcta')
    return cursor.fetchone()[0]


def insert_ingrediente_en_receta(conn, receta_id, ingrediente_id, cantidad, medida):
    cursor = conn.cursor()
    cursor.execute("""  # Se ejecuta la sentencia INSERT para registrar la asociación entre receta e ingrediente con la cantidad y medida correspondientes
        INSERT INTO ingredientes_en_receta (
            receta_id,
            ingrediente_id,
            cantidad,
            medida
        )
        VALUES (%s, %s, %s, %s);
    """, (receta_id, ingrediente_id, cantidad, medida))  # Se pasan los cuatro valores de la asociación como tupla parametrizada para prevenir inyección SQL
    logger.debug('Datos insertados de forma correcta')


def insert_paso(conn, receta_id, numero_paso, descripcion):
    cursor = conn.cursor()
    cursor.execute("""  # Se ejecuta la sentencia INSERT parametrizada para registrar un paso de elaboración asociado a la receta especificada
        INSERT INTO pasos_receta (
            receta_id,
            numero_paso,
            descripcion
        )
        VALUES (%s, %s, %s);
    """, (receta_id, numero_paso, descripcion))  # Se pasan el identificador de la receta, el número de paso y la descripción instruccional como parámetros de la sentencia de inserción
    logger.debug('Datos insertados de forma correcta')


def insert_tip(conn, receta_id, descripcion):
    cursor = conn.cursor()
    cursor.execute("""  # Se ejecuta la sentencia INSERT parametrizada para registrar un consejo culinario asociado a la receta especificada
        INSERT INTO tips_receta (receta_id, descripcion)
        VALUES (%s, %s);
    """, (receta_id, descripcion))  # Se pasan el identificador de la receta y el texto del consejo como parámetros de la sentencia de inserción
    logger.debug('Datos insertados de forma correcta')


def insert_usuarios_recetas_favoritos(conn, receta_id, usuario_id, fecha_modificacion):
    cursor = conn.cursor()
    data = datetime.now(timezone.utc)
    cursor.execute("""  # Se ejecuta la sentencia INSERT parametrizada para crear la asociación entre usuario y receta favorita con las marcas temporales correspondientes
        INSERT INTO usuarios_recetas_favoritos (receta_id, usuario_id, fecha_creacion, fecha_modificacion)
        VALUES (%s, %s, %s, %s);
    """, (receta_id, usuario_id, data, fecha_modificacion))  # Se pasan los identificadores de receta y usuario junto con las marcas temporales como parámetros de la inserción
    logger.debug('Datos insertados de forma correcta')


# -------------------------
# UPDATE
# -------------------------
def update_usuario(conn, usuario_id, newNickname):
    cursor = conn.cursor()
    cursor.execute("""  # Se ejecuta la sentencia UPDATE parametrizada para modificar el apodo del usuario especificado sin alterar otros campos del registro
        UPDATE usuarios
        SET nickname = %s
        WHERE id = %s;
    """, (newNickname, usuario_id))  # Se pasan el nuevo apodo y el identificador del usuario como parámetros de la cláusula WHERE para garantizar la actualización selectiva del registro correcto
    logger.debug('Datos actualizados de forma correcta')


# -------------------------
def update_receta(conn, receta_id, nombre_receta, descripcion, portada, video, tiempo_preparacion, cantidad_porciones):
    cursor = conn.cursor()
    if portada is not None:
        cursor.execute("""  # Se ejecuta la sentencia UPDATE completa que incluye la actualización del campo portada cuando se ha proporcionado una nueva imagen
            UPDATE recetas
            SET nombre_receta = %s, descripcion = %s, portada = %s, video = %s, tiempo_preparacion = %s, cantidad_porciones = %s, fecha_modificacion = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (nombre_receta, descripcion, portada, video, tiempo_preparacion, cantidad_porciones, receta_id))  # Se pasan todos los campos actualizables incluida la portada junto con el identificador de la receta como parámetros de la cláusula WHERE
    else:
        cursor.execute("""  # Se ejecuta la sentencia UPDATE sin el campo portada para preservar la imagen de portada existente cuando no se sube una nueva
            UPDATE recetas
            SET nombre_receta = %s, descripcion = %s, video = %s, tiempo_preparacion = %s, cantidad_porciones = %s, fecha_modificacion = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (nombre_receta, descripcion, video, tiempo_preparacion, cantidad_porciones, receta_id))  # Se pasan los campos actualizables sin portada junto con el identificador de la receta como parámetros de la sentencia
    logger.debug('Receta actualizada de forma correcta')


def update_ingredientes_receta(conn, receta_id, ingredientes):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM ingredientes_en_receta WHERE receta_id = %s", (receta_id,))

    for ingrediente in ingredientes:
        cursor.execute("SELECT id FROM ingredientes WHERE nombre_ingrediente_es = %s", (ingrediente['nombre'],))
        result = cursor.fetchone()

        if result:
            ingrediente_id = result[0]
        else:
            cursor.execute("""  # Se inserta el nuevo ingrediente en el catálogo con marcas temporales automáticas al no disponer de valores nutricionales en el momento de la actualización
                INSERT INTO ingredientes (nombre_ingrediente_es, fecha_creacion, fecha_modificacion)
                VALUES (%s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id
            """, (ingrediente['nombre'],))  # Se pasa únicamente el nombre del ingrediente como parámetro, delegando a PostgreSQL la generación de las marcas temporales de creación y modificación
            ingrediente_id = cursor.fetchone()[0]

        cursor.execute("""  # Se inserta la asociación del ingrediente en la receta con la cantidad y medida actualizadas
            INSERT INTO ingredientes_en_receta (receta_id, ingrediente_id, cantidad, medida)
            VALUES (%s, %s, %s, %s)
        """, (receta_id, ingrediente_id, ingrediente['cantidad'], ingrediente['medida']))  # Se pasan los identificadores de receta e ingrediente junto con la cantidad y medida como parámetros de la inserción

    logger.debug('Ingredientes de receta actualizados de forma correcta')


def update_pasos_receta(conn, receta_id, pasos):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM pasos_receta WHERE receta_id = %s", (receta_id,))

    for i in range(len(pasos)):
        cursor.execute("""  # Se inserta cada paso con su número de orden y descripción instruccional como registro en la tabla pasos_receta
            INSERT INTO pasos_receta (receta_id, numero_paso, descripcion)
            VALUES (%s, %s, %s)
        """, (receta_id, i+1, pasos[i]))  # Se suma 1 al índice base cero del bucle para generar números de paso comenzando en 1, convención más intuitiva para el usuario final

    logger.debug('Pasos de receta actualizados de forma correcta')


def update_tips_receta(conn, receta_id, tips):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tips_receta WHERE receta_id = %s", (receta_id,))

    for tip in tips:
        cursor.execute("""  # Se inserta cada consejo culinario como registro independiente asociado a la receta mediante la clave foránea receta_id
            INSERT INTO tips_receta (receta_id, descripcion)
            VALUES (%s, %s)
        """, (receta_id, tip))  # Se pasan el identificador de la receta y el texto del consejo como parámetros de la sentencia de inserción

    logger.debug('Tips de receta actualizados de forma correcta')


# -------------------------
# DELETE
# -------------------------
def delete_ingrediente(conn, ingrediente_id):
    cursor = conn.cursor()
    cursor.execute("""  # Se ejecuta la sentencia DELETE parametrizada para eliminar el ingrediente especificado del catálogo
        DELETE FROM ingredientes
        WHERE id = %s;
    """, (ingrediente_id,))  # Se pasa el identificador del ingrediente como parámetro único de la cláusula WHERE para garantizar la eliminación selectiva del registro correcto
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
    cursor.execute("""  # Se ejecuta la sentencia DELETE parametrizada que elimina la receta y propaga la eliminación a sus ingredientes, pasos y consejos mediante la restricción CASCADE definida en el esquema
        DELETE FROM recetas
        WHERE id = %s;
    """, (receta_id,))  # Se pasa el identificador de la receta como parámetro único de la cláusula WHERE para eliminar selectivamente el registro correcto
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
    cursor.execute(f"DELETE FROM {table_name} WHERE id = %s", (item_id,))


# -------------------------
# GET
# -------------------------

def get_all_items(table_name, conn):
    """Fetch all rows from the specified table as a list of dicts."""
    if table_name not in ALLOWED_TABLES:
        raise ValueError(f"Table '{table_name}' is not allowed")
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    return [dict(row) for row in rows]


## return only id
def get_usuario_by_firebase_uid(conn, firebase_uid):
    cursor = conn.cursor()
    cursor.execute("""  # Se ejecuta la consulta de búsqueda de usuario por firebase_uid mediante sentencia parametrizada
        SELECT * FROM usuarios
        WHERE firebase_uid = %s;
    """, (firebase_uid,))  # Se pasa el firebase_uid como parámetro de la cláusula WHERE para garantizar la búsqueda segura del usuario correspondiente
    row = cursor.fetchone()
    return row[0] if row else None


def check_receta_in_favoritos(conn, receta_id, user_id):
    if not user_id:
        return False
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""  # Se ejecuta la consulta de verificación de existencia del registro de favorito para la combinación receta-usuario especificada
        SELECT * FROM usuarios_recetas_favoritos WHERE receta_id = %s AND usuario_id = %s;
    """, (receta_id, user_id))  # Se pasan tanto el identificador de la receta como el del usuario como parámetros de la cláusula WHERE para la búsqueda del registro de favorito
    recetas = cursor.fetchall()
    return True if recetas else False


def get_user_liked_recepies_info(conn, id):
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cursor.execute("""  # Se ejecuta la consulta JOIN que combina las tablas recetas y usuarios_recetas_favoritos para obtener las recetas que el usuario ha marcado como favoritas
        SELECT r.* FROM recetas r
        LEFT JOIN usuarios_recetas_favoritos urf ON r.id = urf.receta_id
        WHERE urf.usuario_id = %s;
    """, (id,))  # Se pasa el identificador del usuario como parámetro de la cláusula WHERE para filtrar únicamente las recetas favoritas del usuario consultado
    recetas = [dict(r) for r in cursor.fetchall()]

    for receta in recetas:
        rid = receta["id"]

        cursor.execute("""  # Se ejecuta la consulta JOIN para obtener los ingredientes de la receta con sus cantidades y unidades de medida
            SELECT i.nombre_ingrediente_es, ier.cantidad, ier.medida
            FROM ingredientes_en_receta ier
            LEFT JOIN ingredientes i ON ier.ingrediente_id = i.id
            WHERE ier.receta_id = %s;
        """, (rid,))  # Se pasa el identificador de la receta para recuperar únicamente sus ingredientes asociados
        receta["ingredientes"] = [dict(r) for r in cursor.fetchall()]

        cursor.execute("""  # Se ejecuta la consulta para recuperar los pasos de elaboración de la receta ordenados por número de paso
            SELECT numero_paso, descripcion, imagen
            FROM pasos_receta
            WHERE receta_id = %s
            ORDER BY numero_paso;
        """, (rid,))  # Se pasa el identificador de la receta y se ordena por numero_paso para garantizar la secuencia instruccional correcta
        receta["pasos"] = [dict(r) for r in cursor.fetchall()]

        cursor.execute("""  # Se ejecuta la consulta para recuperar los consejos culinarios asociados a la receta
            SELECT descripcion FROM tips_receta WHERE receta_id = %s;
        """, (rid,))  # Se pasa el identificador de la receta para recuperar únicamente sus consejos asociados
        receta["tips"] = [dict(r) for r in cursor.fetchall()]

    return recetas


def get_user_shared_recepies_info(conn, id):
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cursor.execute("SELECT * FROM recetas WHERE usuario_id = %s;", (id,))
    recetas = [dict(r) for r in cursor.fetchall()]

    for receta in recetas:
        rid = receta["id"]

        cursor.execute("""  # Se ejecuta la consulta JOIN para obtener los ingredientes de la receta del usuario con sus cantidades y unidades de medida
            SELECT i.nombre_ingrediente_es, ier.cantidad, ier.medida
            FROM ingredientes_en_receta ier
            LEFT JOIN ingredientes i ON ier.ingrediente_id = i.id
            WHERE ier.receta_id = %s;
        """, (rid,))  # Se pasa el identificador de la receta para recuperar únicamente los ingredientes asociados a ella
        receta["ingredientes"] = [dict(r) for r in cursor.fetchall()]

        cursor.execute("""  # Se ejecuta la consulta para recuperar los pasos de elaboración ordenados por número de paso
            SELECT numero_paso, descripcion, imagen
            FROM pasos_receta
            WHERE receta_id = %s
            ORDER BY numero_paso;
        """, (rid,))  # Se pasa el identificador de la receta y se ordena por numero_paso para garantizar la secuencia instruccional correcta en la presentación
        receta["pasos"] = [dict(r) for r in cursor.fetchall()]

        cursor.execute("""  # Se ejecuta la consulta para recuperar los consejos culinarios de la receta del usuario
            SELECT descripcion FROM tips_receta WHERE receta_id = %s;
        """, (rid,))  # Se pasa el identificador de la receta para recuperar únicamente sus consejos asociados
        receta["tips"] = [dict(r) for r in cursor.fetchall()]

    return recetas


def get_all_recepies_info(conn):
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM recetas;")
    return [dict(r) for r in cursor.fetchall()]


def get_recepies_page(conn, limit, offset):
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute(
        "SELECT * FROM recetas ORDER BY id DESC LIMIT %s OFFSET %s;",
        (limit, offset)
    )
    recetas = [dict(r) for r in cursor.fetchall()]
    cursor.execute("SELECT COUNT(*) AS total FROM recetas;")
    total = cursor.fetchone()["total"]
    return recetas, total


def get_receta_by_id(rid, conn):
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM recetas WHERE id = %s;", (rid,))
    receta = cursor.fetchone()

    if not receta:
        return None

    receta = dict(receta)

    cursor.execute("""  # Se ejecuta la consulta JOIN que combina ingredientes_en_receta con ingredientes para obtener tanto los datos de cantidad como los valores nutricionales de cada ingrediente de la receta
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
        WHERE ir.receta_id = %s;
    """, (rid,))  # Se pasa el identificador de la receta para recuperar únicamente los ingredientes pertenecientes a esta receta específica
    receta["ingredientes"] = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""  # Se ejecuta la consulta para recuperar los pasos de elaboración de la receta ordenados por número para garantizar la presentación secuencial correcta
        SELECT numero_paso, descripcion, imagen
        FROM pasos_receta
        WHERE receta_id = %s
        ORDER BY numero_paso;
    """, (rid,))  # Se pasa el identificador de la receta con ordenación explícita por numero_paso para preservar la secuencia instruccional
    receta["pasos"] = [dict(r) for r in cursor.fetchall()]

    cursor.execute(
        "SELECT descripcion FROM tips_receta WHERE receta_id = %s;",
        (rid,)
    )
    receta["tips"] = [dict(r) for r in cursor.fetchall()]

    return receta


def get_ingrediente(conn, nombre):
    cursor = conn.cursor()
    cursor.execute("""  # Se ejecuta la consulta de búsqueda del ingrediente por nombre en español o inglés mediante condición OR para soportar ingredientes con denominaciones en ambos idiomas
        SELECT * FROM ingredientes
        WHERE nombre_ingrediente_es = %s OR nombre_ingrediente_en = %s ;
    """, (nombre, nombre))  # Se pasa el nombre buscado como parámetro para ambas condiciones de búsqueda, cubriendo los casos de denominación en español e inglés
    row = cursor.fetchone()
    return row[0] if row else None


def get_all_ingredientes(conn):
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""  # Se ejecuta la consulta selectiva que recupera únicamente el identificador y nombre en español de todos los ingredientes del catálogo
        SELECT id, nombre_ingrediente_es FROM ingredientes;
    """)  # Se proyectan únicamente las columnas necesarias para el componente de autocompletado del formulario de nueva receta, reduciendo el volumen de datos transferidos
    return [dict(r) for r in cursor.fetchall()]


def test():
    conn = create_connection()
    print(get_all_recepies_info(conn))
    conn.close()


if __name__ == "__main__":
    test()
