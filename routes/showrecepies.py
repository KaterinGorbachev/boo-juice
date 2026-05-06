from flask import Flask, Blueprint, session, url_for, redirect, render_template, jsonify, make_response, g, request, current_app, flash, abort
import logging
import sqlite_CRUD_script as dbquery
from testdata import testsSQLite
from extensions import limiter
import os
from dotenv import load_dotenv
from fractions import Fraction
from werkzeug.utils import secure_filename
from urllib.parse import urlparse

## for pdf generation
from pdf_generator import generate_pdf
import traceback

load_dotenv()

secret_api = os.environ.get('API_SECRET')

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}

def allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

def safe_video_url(url):
    if not url:
        return None
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https'):
        return None
    if not parsed.netloc:
        return None
    return url

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

#=======================================================================================
# ROUTES
#=======================================================================================
recepy_page = Blueprint('recepy_page', __name__)

PAGE_SIZE = 8

@recepy_page.route('/recetas')
def show_all_heloween_recepies():
    page = request.args.get("page", 1, type=int)
    is_user = session.get('user_loggedin')
    if is_user:
        user_uid = session.get("uid")

    try:
        offset = (page - 1) * PAGE_SIZE

        with dbquery.get_connection() as conn:
            visible_items, total = dbquery.get_recepies_page(conn, PAGE_SIZE, offset)

        has_more = (offset + PAGE_SIZE) < total

    except Exception as e:
        logger.error(f"Error getting data: {e}")
        print(e)
        abort(500)

    return render_template('allrecepies.html', data=visible_items, user=is_user, page=page,
        has_more=has_more)


@recepy_page.route('/recetas/more')
def load_more_recepies():
    page = request.args.get("page", 1, type=int)
    offset = (page - 1) * PAGE_SIZE
    try:
        with dbquery.get_connection() as conn:
            visible_items, total = dbquery.get_recepies_page(conn, PAGE_SIZE, offset)
        has_more = (offset + PAGE_SIZE) < total
        items_data = [
            {'id': item['id'], 'nombre_receta': item['nombre_receta'], 'portada': item.get('portada')}
            for item in visible_items
        ]
        return jsonify({'items': items_data, 'has_more': has_more, 'page': page})
    except Exception as e:
        logger.error(f"Error getting data: {e}")
        abort(500)

@recepy_page.route('/receta/<int:id>') 
def receta(id): 
    
    is_user = session.get('user_loggedin')
    
    if is_user:
        user_sql_id = session.get("sql_user_id")
    else:
        user_sql_id = None

    try:
        with dbquery.get_connection() as conn:
            data = dbquery.get_receta_by_id(id, conn)
            for item in (data or {}).get('ingredientes', []):
                if type(item['cantidad']) == float and (item['cantidad'] < 1 and item['cantidad'] > 0):
                    frac = Fraction(item['cantidad']).limit_denominator(10)
                    item['cantidad_str'] = str(frac)
                elif type(item['cantidad']) == float and item['cantidad'] >= 1:
                    item['cantidad_str'] = f"{item['cantidad']:g}"
                else:
                    item['cantidad_str'] = ''

            receta_in_favoritos = dbquery.check_receta_in_favoritos(conn, id, user_sql_id)
            can_save = bool(is_user and not receta_in_favoritos)

    except Exception as e:
        logger.error(f"Error getting data: {e}")
        abort(500)

    if not data:
        abort(404)

    return render_template('receta.html', data=data, user=is_user, can_save=can_save)


@recepy_page.route("/receta/pdf/<int:id>")
@limiter.limit("10 per minute")
def recepy_pdf(id):
    try:
        with dbquery.get_connection() as conn:
            text_content = dbquery.get_receta_by_id(id, conn)

        if text_content and text_content.get('ingredientes'):
            for item in text_content['ingredientes']:
                cantidad = item.get('cantidad', 0)
                try:
                    cantidad_val = float(cantidad)
                except (TypeError, ValueError):
                    cantidad_val = 0

                if 0 < cantidad_val < 1:
                    frac = Fraction(cantidad_val).limit_denominator(10)
                    item['cantidad_str'] = str(frac)
                elif cantidad_val >= 1:
                    item['cantidad_str'] = f"{cantidad_val:g}"
                else:
                    item['cantidad_str'] = ''

        rendered_html = render_template("receta_pdf.html", data=text_content)
        pdf = generate_pdf(rendered_html)

        response = make_response(pdf)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = 'inline; filename=document.pdf'
        return response

    except Exception as e:
        print("PDF Generation Error:", traceback.format_exc())
        abort(500)
    

## edit recepy
@recepy_page.route("/edit_receta/<int:id>", methods=['GET', 'POST'])
def edit_receta(id):
    is_user = session.get('user_loggedin')
    if not is_user:
        return redirect('/')

    user_sql_id = session.get("sql_user_id")

    try:
        with dbquery.get_connection() as conn:
            # Check if user owns the recipe
            cursor = conn.cursor()
            cursor.execute("SELECT usuario_id FROM recetas WHERE id = %s", (id,))
            result = cursor.fetchone()
            if not result or result[0] != user_sql_id:
                abort(400)

            if request.method == 'POST':
                nombre_receta = request.form.get('nombre_receta', '').strip()
                descripcion = request.form.get('descripcion', '').strip()
                video = safe_video_url(request.form.get('video', '').strip())

                errors = []

                if not testsSQLite.is_string(nombre_receta, 2, 150):
                    errors.append('Nombre de receta inválido (2-150 caracteres).')
                if not testsSQLite.is_string(descripcion, 2, 500):
                    errors.append('Descripción inválida (2-500 caracteres).')

                try:
                    tiempo_preparacion = int(request.form.get('tiempo_preparacion', ''))
                    cantidad_porciones = int(request.form.get('cantidad_porciones', ''))
                except (ValueError, TypeError):
                    errors.append('Tiempo y porciones deben ser números enteros.')
                    tiempo_preparacion = cantidad_porciones = None

                if tiempo_preparacion is not None and not testsSQLite.is_integer(tiempo_preparacion, min=1):
                    errors.append('Tiempo de preparación debe ser mayor que 0.')
                if cantidad_porciones is not None and not testsSQLite.is_integer(cantidad_porciones, min=1):
                    errors.append('Cantidad de porciones debe ser mayor que 0.')

                nombres = request.form.getlist('ingrediente_nombre[]')
                cantidades_raw = request.form.getlist('ingrediente_cantidad[]')
                medidas = request.form.getlist('ingrediente_medida[]')
                ingredientes = []
                for i, nombre in enumerate(nombres):
                    if not nombre.strip():
                        continue
                    try:
                        cantidad_val = float(cantidades_raw[i])
                    except (ValueError, IndexError):
                        errors.append(f'Cantidad del ingrediente {i + 1} inválida.')
                        continue
                    ingredientes.append({
                        'nombre': nombre.strip(),
                        'cantidad': cantidad_val,
                        'medida': medidas[i] if i < len(medidas) else ''
                    })

                if len(ingredientes) < 1:
                    errors.append('Debes incluir al menos un ingrediente.')
                elif testsSQLite.validate_ingredients(ingredientes):
                    errors.append('Datos de ingredientes inválidos.')

                pasos = [p.strip() for p in request.form.getlist('paso_descripcion[]') if p.strip()]
                if len(pasos) < 1:
                    errors.append('Debes incluir al menos un paso.')

                tips = [t.strip() for t in request.form.getlist('tips[]') if t.strip()]
                for tip in tips:
                    if not testsSQLite.is_string(tip, 0, 200):
                        errors.append('Cada tip debe tener máximo 200 caracteres.')
                        break

                if errors:
                    for msg in errors:
                        flash(msg, 'error')
                    return redirect(url_for('recepy_page.edit_receta', id=id))

                portada = None
                if 'portada' in request.files:
                    file = request.files['portada']
                    if file and file.filename and allowed_image(file.filename):
                        filename = f"recipe_{id}_{secure_filename(file.filename)}"
                        file_path = os.path.join(current_app.root_path, 'static', 'assets', 'images', filename)
                        file.save(file_path)
                        portada = f"/static/assets/images/{filename}"

                dbquery.update_receta(conn, id, nombre_receta, descripcion, portada, video, tiempo_preparacion, cantidad_porciones)
                dbquery.update_ingredientes_receta(conn, id, ingredientes)
                dbquery.update_pasos_receta(conn, id, pasos)
                dbquery.update_tips_receta(conn, id, tips)

                flash('Receta actualizada de forma correcta', 'success')
                return redirect(url_for('recepy_page.receta', id=id))

            else:
                data = dbquery.get_receta_by_id(id, conn)
                for item in data['ingredientes']:
                    if type(item['cantidad']) == float and (item['cantidad'] < 1 and item['cantidad'] > 0):
                        frac = Fraction(item['cantidad']).limit_denominator(10)
                        item['cantidad_str'] = str(frac)
                    elif type(item['cantidad']) == float and item['cantidad'] >= 1:
                        item['cantidad_str'] = f"{item['cantidad']:g}"
                    else:
                        item['cantidad_str'] = ''

                return render_template('edit_receta.html', data=data, user=is_user, user_uid=session.get("uid", ""))

    except Exception as e:
        flash('Ha habido un problema en conexión. Intenta más tarde.', '❌Error')
        return redirect(url_for('vue_app'))


@recepy_page.errorhandler(500)
def internal_error(error):
    print(error)
    return render_template('500.html'), 500 

@recepy_page.errorhandler(404)
def not_found(error):
    print(error)
    return render_template('404.html'), 404

