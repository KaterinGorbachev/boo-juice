from flask import Flask, send_from_directory, request, jsonify, render_template, session, g, redirect, Blueprint, flash, url_for, abort
from functools import wraps
import os
import logging
import re
import requests
from dotenv import load_dotenv
from datetime import datetime, timezone
import hashlib
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from flask_wtf.csrf import CSRFProtect
from extensions import limiter

from routes.showrecepies import recepy_page
from routes.adminCrud import dashboard_admin
from pdf_generator import start_browser

""" from sys import path
path.append('.') """
from testdata import testsSQLite 
import sqlite_CRUD_script as dbquery

load_dotenv()

_service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
if not _service_account_path:
    raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_PATH environment variable is not set")
firebase_admin.initialize_app(credentials.Certificate(_service_account_path))

_SMART_QUOTE_CHARS = "\u201c\u201d\u00ab\u00bb\u201e\u2018\u2019"
_SMART_QUOTE_RE = re.compile(r'(?<!\w)[' + _SMART_QUOTE_CHARS + r'](?!\w)')

# Origins allowed to call CSRF-exempt JSON endpoints.
# Set ALLOWED_ORIGINS=https://yourdomain.com in production.
# Multiple values: comma-separated.  Falls back to same-host when unset (dev).
_ALLOWED_ORIGINS: frozenset = frozenset(
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()
)

def _origin_allowed() -> bool:
    origin = request.headers.get("Origin")
    if not origin:
        return False
    if _ALLOWED_ORIGINS:
        return origin in _ALLOWED_ORIGINS
    host = request.host
    return origin in (f"http://{host}", f"https://{host}")



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

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, "static"),
    static_url_path="/",              # 🔴 FORCE STATIC AT ROOT
    template_folder=os.path.join(BASE_DIR, "templates"),
)

secretkey = os.getenv('FLASK_SECRET_KEY')
if not secretkey:
    raise RuntimeError("FLASK_SECRET_KEY environment variable is not set")

app.secret_key = secretkey

app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = True

csrf = CSRFProtect(app)
limiter.init_app(app)

app.register_blueprint(recepy_page)
app.register_blueprint(dashboard_admin)

start_browser()

###
# UID helpers
##
def hash_uid(uid: str) -> str:
    return hashlib.sha256(uid.encode()).hexdigest()

def verify_firebase_uid(uid: str) -> bool:
    try:
        firebase_auth.get_user(uid)
        return True
    except firebase_admin.auth.UserNotFoundError:
        return False

###
# Security checks custom decorators
##
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not g.user:
            return redirect("/")
        return f(*args, **kwargs)
    return decorated

def email_verified_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not g.user or not g.user.get("email_verified"):
            return redirect("/")
        return f(*args, **kwargs)
    return decorated

# ---- ROUTES ----

# context for user auth
@app.before_request
def load_user_from_session():
    uid = session.get("uid")

    if uid:
        g.user = {
            "uid": uid,
            "email_verified": session.get("email_verified", False)
        }
    else:
        g.user = None 






## ------------ GET UID from front and save user in SQLite
@app.route("/api/user", methods=["POST"])
@csrf.exempt
@limiter.limit("10 per minute; 50 per hour")
def api_user():
    if not _origin_allowed():
        abort(403)

    data = request.get_json(silent=True) or {}
    uid = data.get("uid")
    email_verified = data.get("emailVerified", False)

    # ---------- LOGOUT ----------
    if uid is None:
        session.pop("uid", None)
        session["email_verified"] = False
        session["user_loggedin"] = False
        session["sql_user_id"] = None

        return jsonify({"status": "logged_out"}), 200

    # ---------- LOGIN ----------
    if not verify_firebase_uid(uid):
        abort(400)

    session["uid"] = uid
    session["email_verified"] = bool(email_verified)
    session["user_loggedin"] = True
    

    try:
        with dbquery.get_connection("recetas.db") as conn:
            user_exists = dbquery.get_usuario_by_firebase_uid(conn, hash_uid(uid))
            session["sql_user_id"] = user_exists

            if not user_exists:
                user_sql_id = dbquery.insert_usuario(conn, hash_uid(uid))
                session["sql_user_id"] = user_sql_id

        return jsonify({"status": "logged_in"}), 200

    except Exception as e:
        dbquery.logger.error(f"Error inserting user: {e}")
        return jsonify({"error": "internal error"}), 500
    

# ---- login, register, logout functionality on the page ----
@app.route("/")
def vue_app():
    
    return render_template("index.html")

## ruta protegida solo para usuarios con email verificado
@app.route('/nuevareceta')
@email_verified_required
def render_recepy_form():
    try:
        with dbquery.get_connection('recetas.db') as conn:
            data_ingredientes = dbquery.get_all_ingredientes(conn)
        return render_template("recepyform.html", data=data_ingredientes)
    except Exception as e:
        logger.error(f"Error loading form: {e}")
        abort(500)

@app.route('/api/recipes', methods=['POST'])
@limiter.limit("20 per hour")
def get_new_recipe():
    # only for "Content-Type": "application/json"
    # does not handle files and images
    data = request.get_json()


    if not data:
        logger.debug('Did not receive JSON recepy form data from Front')
        return jsonify({"error": "No JSON received"}), 400  
        
    # ==== is None checks ====
    if "name" not in data.keys() or testsSQLite.value_is_none(data["name"]) : 
        logger.debug('Did not receive recepy name')
        return jsonify({"error": "No recepy name in JSON received"}), 400
    elif "description" not in data.keys() or testsSQLite.value_is_none(data["description"]) : 
        logger.debug('Did not receive recepy description')
        return jsonify({"error": "No recepy description in JSON received"}), 400 
    elif "minutes" not in data.keys() or testsSQLite.value_is_none(data["minutes"]) : 
        logger.debug('Did not receive recepy minutes')
        return jsonify({"error": "No recepy minutes in JSON received"}), 400
    elif "ingredients" not in data.keys() or testsSQLite.value_is_none(data["ingredients"]) : 
        logger.debug('Did not receive recepy ingredients')
        return jsonify({"error": "No recepy ingredients in JSON received"}), 400
    elif "steps" not in data.keys() or testsSQLite.value_is_none(data["steps"]) : 
        logger.debug('Did not receive recepy steps')
        return jsonify({"error": "No recepy steps in JSON received"}), 400  
    elif "servings" not in data.keys() or testsSQLite.value_is_none(data["servings"]) : 
        logger.debug('Did not receive recepy servings')
        return jsonify({"error": "No recepy servings in JSON received"}), 400  
    
    # === data type checks ====    
    elif  not isinstance(data["ingredients"], list):
        logger.debug('Did not receive recepy ingredients as a list')
        return jsonify({"error": "Recepy ingredients in JSON must be a list"}), 400
    elif  not isinstance(data["steps"], list):
        logger.debug('Did not receive recepy steps as a list')
        return jsonify({"error": "Recepy steps in JSON must be a list"}), 400
    elif not testsSQLite.is_string(data["name"], 2, 150): 
        logger.debug('Invalid name')
        return jsonify({"error": "Invalid name in JSON received"}), 400
    elif not testsSQLite.is_string(data["description"], 2, 500): 
        logger.debug('Invalid description')
        return jsonify({"error": "Invalid description in JSON received"}), 400
    elif not testsSQLite.is_integer(data["minutes"]): 
        logger.debug('Invalid minutes')
        return jsonify({"error": "Invalid minutes in JSON received"}), 400
    elif not testsSQLite.is_integer(data["servings"]): 
        logger.debug('Invalid servings')
        return jsonify({"error": "Invalid servings in JSON received"}), 400
    
    # === data existence for list checks ===
    elif len(data["ingredients"]) < 1: 
        logger.debug('No hay ingredients')
        return jsonify({"error": "No hay ingredients in JSON received"}), 400
    elif len(data["steps"]) < 1: 
        logger.debug('No hay steps')
        return jsonify({"error": "No hay steps in JSON received"}), 400
    
    # === data type inside list checks ===    
    ingredients_errors = testsSQLite.validate_ingredients(data["ingredients"])
    if len(ingredients_errors)>0: 
        logger.debug(ingredients_errors)
        return jsonify({"error": "Errors in ingredients data in JSON received"}), 400
             
    steps_errors = testsSQLite.validate_steps(data["steps"])
    if len(steps_errors)>0: 
        logger.debug(steps_errors)
        return jsonify({"error": "Errors in steps data in JSON received"}), 400
        
    tips = data.get("tips", [])
    if isinstance(tips, list) and len(tips) >= 1:
        for item in tips:
            if not testsSQLite.is_string(item, 0, 200):
                logger.debug('Invalid tip type, not a string')
                return jsonify({"error": "Invalid tip type, not a string, in JSON received"}), 400
            
    ## ?? max numero of pasos y of tips ??
            
    # === checks for images and files ==== 
    ###########  missing  ######################
 
    ingredients = data["ingredients"]
    steps = data["steps"]
    

    # === get user from dataBase === 
    
    is_user = session.get('user_loggedin')

    # think about checks for user uid
    # from what page to send user uid
    # how long session saves uid

    if not is_user:
        logger.debug('No user logged in session')
        return jsonify({"error": "No user logged in session"}), 403
      
    # === insert recepy into dataBase ===
    # Insert the recipe into the database using user_uid
    # get user id based on uid from table
    try:
        user_uid = session.get("uid")
        with dbquery.get_connection('recetas.db') as conn:
            user_id = dbquery.get_usuario_by_firebase_uid(conn, hash_uid(user_uid))

            if not user_id:
                logger.debug('User UID not found in database, creating new user')
                user_id = dbquery.insert_usuario(conn, hash_uid(user_uid))

            receta = {
                "usuario_id": int(user_id),
                "nombre_receta": str(data["name"]).strip(),
                "descripcion": str(data["description"]).strip(),
                "portada": (data.get("portada") or "").strip(),
                "video": (data.get("video") or "").strip(),
                "tiempo_preparacion": int(data["minutes"]),
                "cantidad_porciones": int(data.get("servings", 2)),
            }

            receta_id = dbquery.insert_receta(
                conn,
                receta["usuario_id"],
                receta["nombre_receta"],
                receta["descripcion"],
                receta["tiempo_preparacion"],
                receta["cantidad_porciones"],
                receta["portada"],
                receta["video"]
            )

            for item in ingredients:
                id_ingredient = dbquery.get_ingrediente(conn, item["nombre"])
                if not id_ingredient:
                    id_ingredient = dbquery.insert_ingrediente(
                        conn, item["nombre"], '', '', '', '', ''
                    )

                dbquery.insert_ingrediente_en_receta(
                    conn, receta_id, int(id_ingredient), item["cantidad"], item["medida"]
                )

            for item in steps:
                dbquery.insert_paso(
                    conn, receta_id, int(item["id"]), str(item["text"]).strip()
                )

            if len(tips) >= 1:
                for item in tips:
                    dbquery.insert_tip(conn, receta_id, str(item).strip())

    except Exception as e:
        logger.error(f"Error inserting recipe: {e}")
        return jsonify({"error": "Error inserting recipe into database"}), 500

    return jsonify({"status": "ok"}), 200


@app.route('/tablacalorias/from_receta/<int:id>')
def calorias(id): 
    return render_template('tabla_calorias.html', data = id)


@app.route('/saverecepy/<int:id>')
@login_required
def save_recepy(id):
    fecha = datetime.now(timezone.utc)
    usuario_uid = session.get("uid")

    try:
        with dbquery.get_connection('recetas.db') as conn:
            user = dbquery.get_usuario_by_firebase_uid(conn, hash_uid(usuario_uid))

            if not user:
                user = dbquery.insert_usuario(conn, hash_uid(usuario_uid))

            if dbquery.check_receta_in_favoritos(conn, id, user):
                flash("La receta ya está en favoritos", "I")
                return redirect(url_for("recepy_page.receta", id=id))

            dbquery.insert_usuarios_recetas_favoritos(conn, id, user, fecha)

        flash("Receta guardada", "success")
        return redirect(url_for("recepy_page.receta", id=id))

    except Exception as e:
        dbquery.logger.error(f"Error guardando favoritos: {e}")
        flash("Ha habido un problema. Intenta más tarde", "error")
        return redirect(url_for("recepy_page.receta", id=id))


@app.route('/perfil/<uid>')
@login_required
def perfil(uid):
    sql_id = session.get("sql_user_id")
    try:
        with dbquery.get_connection('recetas.db') as conn:
            shared = dbquery.get_user_shared_recepies_info(conn, sql_id)
            liked = dbquery.get_user_liked_recepies_info(conn, sql_id)
        return render_template('user_perfil.html', shared=shared, liked=liked)
    except Exception as e:
        logger.error(f"Error loading profile: {e}")
        abort(500)


@app.route('/privacy')
def data_privacy(): 
    return render_template('privacy.html')







@app.route('/healthz')
def healthz():
    return jsonify({"status": "ok"}), 200


#----------------------------------------
# Error handlers
#----------------------------------------

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500


#----------------------------------------
# App termination request
#----------------------------------------


if __name__ == "__main__":
    
    app.run(debug=False)
