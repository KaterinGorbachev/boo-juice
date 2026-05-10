from flask import Flask, Blueprint, session, url_for, redirect, render_template, jsonify, make_response, g, request, flash, abort
import logging
import sqlite_CRUD_script as dbquery
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_PASS = os.environ.get('PASS_KEY_ADMIN')

ALLOWED_TABLES = {
    'recetas',
    'usuarios',
    'ingredientes'
}


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


dashboard_admin = Blueprint('dashboard_admin', __name__)



## admin enter key route
@dashboard_admin.route('/access', methods=['GET','POST'])
def login_admin():

    if request.method == 'POST':
        admin_key = request.form.get("password", "")

        if admin_key.strip() != '':
            if admin_key == ADMIN_PASS:
                session['admin_logged'] = True
                return redirect("/dashboard")

            else:
                flash("Contraseña incorrecta", "error")
                return redirect(url_for("dashboard_admin.login_admin"))


        else:
            flash("Contraseña vacia", "error")
            return redirect(url_for("dashboard_admin.login_admin"))


    return render_template('dashboard_login.html')


@dashboard_admin.route('/dashboard', methods=['GET','POST'])
def dashboard():
    if not session.get('admin_logged'):
        return redirect('/access')

    selected_table = request.args.get('table', 'recetas')
    if selected_table not in ALLOWED_TABLES:
        abort(400)


    try:
        with dbquery.get_connection() as conn:
            if selected_table == 'recetas':
                items = dbquery.get_all_recepies_info(conn)
            else:
                items = dbquery.get_all_items(selected_table, conn)
        return render_template('dashboard.html', items=items, selected_table=selected_table)
    except Exception as e:
        logger.error(f"Error loading dashboard: {e}")
        abort(500)


@dashboard_admin.route('/delete/<table>/<int:item_id>', methods=['POST'])
def delete_item(table, item_id):
    if not session.get('admin_logged'):
        return redirect('/access')

    if table not in ALLOWED_TABLES:
        return jsonify({"error": "Invalid table"}), 400

    try:
        with dbquery.get_connection() as conn:
            dbquery.delete_item(table, item_id, conn)
        logger.info(f"Item with ID {item_id} deleted from table '{table}' by admin.")
        return redirect(f'/dashboard?table={table}')
    except Exception as e:
        logger.error(f"Error deleting item: {e}")
        abort(500)


@dashboard_admin.route('/logout')
def logout():
    session.pop('admin_logged', None)
    return redirect('/access')


@dashboard_admin.errorhandler(500)
def internal_error(_):
    return render_template('500.html'), 500

@dashboard_admin.errorhandler(404)
def not_found(_):
    return render_template('404.html'), 404


@dashboard_admin.errorhandler(400)
def bad_request(_):
    return render_template('400.html'), 400
