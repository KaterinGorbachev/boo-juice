from flask import (
    Blueprint, session, url_for, redirect, render_template,
    jsonify, make_response, request, flash, abort,
)
from werkzeug.exceptions import HTTPException
import logging
import sqlite_CRUD_script as dbquery
from testdata import testsSQLite
from extensions import limiter
import os
from dotenv import load_dotenv
from fractions import Fraction
from urllib.parse import urlparse

from pdf_generator import generate_pdf
import traceback

load_dotenv()

secret_api = os.environ.get('API_SECRET')

# -------------------------
# Helpers
# -------------------------


# safe_video_url: validates that a URL has an http/https scheme and a netloc; returns None otherwise
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


# makeLogger: creates and returns the module-level logger
def makeLogger():
    logger = logging.getLogger(__name__)
    logger.setLevel('DEBUG')
    return logger


# formatLoggs: returns the standard log formatter for this module
def formatLoggs():
    return logging.Formatter(
        '{asctime} - {name} - {message}',
        datefmt='%d/%m/%Y %I:%M:%S %p',
        style='{',
    )


# getConsoleLogger: attaches a DEBUG-level console handler to the given logger
def getConsoleLogger(logger):
    console_handler = logging.StreamHandler()
    console_handler.setLevel('DEBUG')
    console_handler.setFormatter(formatLoggs())
    logger.addHandler(console_handler)


# getFileLogger: attaches an INFO-level file handler (access.log) to the given logger
def getFileLogger(logger):
    file_handler = logging.FileHandler('access.log', mode='a', encoding='utf-8')
    file_handler.setLevel('INFO')
    file_handler.setFormatter(formatLoggs())
    logger.addHandler(file_handler)


logger = makeLogger()
getConsoleLogger(logger)

recepy_page = Blueprint('recepy_page', __name__)

PAGE_SIZE = 8


def _format_cantidad(item):
    """Set item['cantidad_str'] based on the numeric value of item['cantidad']."""
    cantidad = item['cantidad']
    if isinstance(cantidad, float) and 0 < cantidad < 1:
        item['cantidad_str'] = str(Fraction(cantidad).limit_denominator(10))
    elif isinstance(cantidad, float) and cantidad >= 1:
        item['cantidad_str'] = f"{cantidad:g}"
    else:
        item['cantidad_str'] = ''


# show_all_heloween_recepies: renders the paginated recipe list page
@recepy_page.route('/recetas')
def show_all_heloween_recepies():
    page = request.args.get("page", 1, type=int)
    is_user = session.get('user_loggedin')

    try:
        offset = (page - 1) * PAGE_SIZE

        with dbquery.get_connection() as conn:
            visible_items, total = dbquery.get_recepies_page(conn, PAGE_SIZE, offset)

        has_more = (offset + PAGE_SIZE) < total

    except Exception as e:
        logger.error(f"Error getting data: {e}")
        abort(500)

    return render_template(
        'allrecepies.html',
        data=visible_items,
        user=is_user,
        page=page,
        has_more=has_more,
    )


# load_more_recepies: returns the next page of recipes as JSON for AJAX infinite scroll
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


# receta: renders the full detail page for a single recipe by id
@recepy_page.route('/receta/<int:id>')
def receta(id):
    is_user = session.get('user_loggedin')
    user_sql_id = session.get("sql_user_id") if is_user else None

    try:
        with dbquery.get_connection() as conn:
            data = dbquery.get_receta_by_id(id, conn)
            for item in (data or {}).get('ingredientes', []):
                _format_cantidad(item)

            receta_in_favoritos = dbquery.check_receta_in_favoritos(conn, id, user_sql_id)
            can_save = bool(is_user and not receta_in_favoritos)
            is_saved = bool(is_user and receta_in_favoritos)

    except Exception as e:
        logger.error(f"Error getting data: {e}")
        abort(500)

    if not data:
        abort(404)

    return render_template('receta.html', data=data, user=is_user, can_save=can_save, is_saved=is_saved)


# recepy_pdf: generates and returns a PDF document for the recipe with the given id
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
                    item['cantidad_str'] = str(Fraction(cantidad_val).limit_denominator(10))
                elif cantidad_val >= 1:
                    item['cantidad_str'] = f"{cantidad_val:g}"
                else:
                    item['cantidad_str'] = ''

        rendered_html = render_template("receta_pdf.html", data=text_content)
        pdf = generate_pdf(rendered_html, base_url=request.url_root)

        response = make_response(pdf)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = 'inline; filename=document.pdf'
        return response

    except Exception:
        print("PDF Generation Error:", traceback.format_exc())
        abort(500)


# edit_receta: renders the edit form for an existing recipe (GET only). Submission is handled by api_update_receta.
@recepy_page.route("/edit_receta/<int:id>", methods=['GET'])
def edit_receta(id):
    is_user = session.get('user_loggedin')
    if not is_user:
        return redirect('/')

    user_sql_id = session.get("sql_user_id", False)

    try:
        with dbquery.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT usuario_id FROM recetas WHERE id = %s", (id,))
            result = cursor.fetchone()
            if not result or result[0] != user_sql_id:
                abort(400)

            data = dbquery.get_receta_by_id(id, conn)
            for item in data['ingredientes']:
                _format_cantidad(item)

            return render_template(
                'edit_receta.html',
                data=data,
                user=is_user,
                user_uid=session.get("uid", ""),
            )

    except HTTPException:
        raise
    except Exception:
        flash('Ha habido un problema en conexión. Intenta más tarde.', '❌Error')
        return redirect(url_for('vue_app'))


# api_update_receta: JSON endpoint to update an existing recipe. Mirrors the validation in /api/recipes.
@recepy_page.route("/api/recipes/<int:id>", methods=['PUT'])
@limiter.limit("20 per hour")
def api_update_receta(id):
    is_user = session.get('user_loggedin')
    if not is_user:
        return jsonify({"error": "No user logged in session"}), 403

    user_sql_id = session.get("sql_user_id")

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No JSON received"}), 400

    required = ("name", "description", "minutes", "servings", "ingredients", "steps")
    for key in required:
        if key not in data or testsSQLite.value_is_none(data[key]):
            return jsonify({"error": f"Missing field: {key}"}), 400

    if not isinstance(data["ingredients"], list):
        return jsonify({"error": "ingredients must be a list"}), 400
    if not isinstance(data["steps"], list):
        return jsonify({"error": "steps must be a list"}), 400
    if not testsSQLite.is_string(data["name"], 2, 150):
        return jsonify({"error": "Invalid name (2-150 chars)"}), 400
    if not testsSQLite.is_string(data["description"], 2, 500):
        return jsonify({"error": "Invalid description (2-500 chars)"}), 400
    if not testsSQLite.is_integer(data["minutes"], min=1):
        return jsonify({"error": "Invalid minutes"}), 400
    if not testsSQLite.is_integer(data["servings"], min=1):
        return jsonify({"error": "Invalid servings"}), 400
    if len(data["ingredients"]) < 1:
        return jsonify({"error": "At least one ingredient required"}), 400
    if len(data["steps"]) < 1:
        return jsonify({"error": "At least one step required"}), 400

    if testsSQLite.validate_ingredients(data["ingredients"]):
        return jsonify({"error": "Invalid ingredients"}), 400

    tips = data.get("tips", []) or []
    if not isinstance(tips, list):
        return jsonify({"error": "tips must be a list"}), 400
    for tip in tips:
        if not testsSQLite.is_string(tip, 0, 200):
            return jsonify({"error": "Each tip must be a string up to 200 chars"}), 400

    pasos = []
    for i, step in enumerate(data["steps"]):
        if isinstance(step, dict):
            text = step.get("text", "")
        else:
            text = step
        if not testsSQLite.is_string(text, 1, None):
            return jsonify({"error": f"Invalid step {i + 1}"}), 400
        pasos.append(str(text).strip())

    video = safe_video_url((data.get("video") or "").strip())

    try:
        with dbquery.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT usuario_id FROM recetas WHERE id = %s", (id,))
            result = cursor.fetchone()
            if not result or result[0] != user_sql_id:
                return jsonify({"error": "Not allowed"}), 403

            ingredientes = [
                {
                    'nombre': str(ing["nombre"]).strip(),
                    'cantidad': float(ing["cantidad"]),
                    'medida': ing["medida"],
                }
                for ing in data["ingredients"]
            ]

            dbquery.update_receta(
                conn, id,
                str(data["name"]).strip(),
                str(data["description"]).strip(),
                None,
                video,
                int(data["minutes"]),
                int(data["servings"]),
            )
            dbquery.update_ingredientes_receta(conn, id, ingredientes)
            dbquery.update_pasos_receta(conn, id, pasos)
            dbquery.update_tips_receta(conn, id, [t.strip() for t in tips if t.strip()])

    except Exception as e:
        logger.error(f"Error updating recipe {id}: {e}")
        return jsonify({"error": "Error updating recipe"}), 500

    return jsonify({"status": "ok"}), 200


# internal_error: renders the 500 error page for this Blueprint
@recepy_page.errorhandler(500)
def internal_error(error):
    print(error)
    return render_template('500.html'), 500


# not_found: renders the 404 error page for this Blueprint
@recepy_page.errorhandler(404)
def not_found(error):
    print(error)
    return render_template('404.html'), 404

# denied access
@recepy_page.errorhandler(400)
def forbidden(error):
    print(error)
    return render_template('400.html'), 400

