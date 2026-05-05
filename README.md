# Boo-Juice

A recipe sharing and management web application built with Flask and PostgreSQL. Users can browse, create, edit, and save recipes, calculate nutritional information, and export recipes as PDFs. An admin dashboard provides full data management capabilities.

---

## Features

- **Recipe browsing** — paginated listing with cover images and previews
- **Recipe detail pages** — ingredients, step-by-step instructions, tips, video, and nutrition data
- **Recipe creation & editing** — authenticated users can submit and manage their own recipes
- **Favorites** — save recipes to a personal profile
- **Calorie calculator** — per-ingredient nutritional breakdown using a built-in dataset
- **PDF export** — download any recipe as a formatted PDF (powered by WeasyPrint)
- **Firebase authentication** — email-verified login required to post content
- **Admin dashboard** — password-protected interface to manage users, recipes, and ingredients

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask |
| Database | PostgreSQL (psycopg2) |
| Auth | Firebase (client-side) |
| PDF | WeasyPrint |
| Frontend | Jinja2 templates, Vite-compiled assets, vanilla JS |
| Environment | python-dotenv |

---

## Getting Started

### Prerequisites

- Python 3.10+
- PostgreSQL server (local or hosted, e.g. Render)
- A Firebase project with email/password auth enabled
- A Firebase service account JSON key (for server-side UID verification)
- WeasyPrint system dependencies (GTK3 — see [WeasyPrint install guide](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#installation); PDF export is disabled gracefully if missing)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd Boo-Juice-Deployment

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Environment variables

Create a `.env` file in the project root:

```env
FLASK_SECRET_KEY=your-secret-key-here
PASS_KEY_ADMIN=your-admin-password-here
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json
DATABASE_URL=postgresql://user:password@localhost:5432/recetas
API_SECRET=your-nutrition-api-key
```

`FIREBASE_SERVICE_ACCOUNT_PATH` must point to a Firebase service account JSON file. Download it from **Firebase Console → Project Settings → Service Accounts → Generate new private key**. Keep this file out of version control — it is already listed in `.gitignore`.

`DATABASE_URL` must point to a running PostgreSQL instance. For Render deployments, use the **External Database URL** found in the Render dashboard under your PostgreSQL service → **Connect**.

### Initialize the database

```bash
# Create the tables in PostgreSQL
python sqlite_create_db.py
```

### Migrate existing data from SQLite (one-time)

If you have an existing `recetas.db` SQLite file to carry over:

```bash
python migrate_sqlite_to_postgres.py
```

The script truncates all PostgreSQL tables, inserts every row with its original ID, resets sequences, and skips any orphaned rows that violate foreign key constraints (a side-effect of SQLite not enforcing FK constraints at runtime).

### Run the development server

```bash
flask --app app run --debug
```

The app will be available at `http://127.0.0.1:5000`.

---

## Project Structure

```
Boo-Juice-Deployment/
├── app.py                        # Application factory and core routes
├── routes/
│   ├── showrecepies.py           # Recipe display and user-facing CRUD routes
│   └── adminCrud.py              # Admin dashboard blueprint
├── templates/                    # Jinja2 HTML templates
├── static/
│   ├── scripts/                  # Client-side JavaScript
│   ├── styles/                   # CSS stylesheets
│   └── assets/                   # Images and Vite-compiled frontend bundles
├── sqlite_create_db.py           # PostgreSQL schema initialization
├── sqlite_CRUD_script.py         # Database query helpers (psycopg2)
├── migrate_sqlite_to_postgres.py # One-time data migration from recetas.db
├── backup_db.py                  # Export all tables to JSON/CSV backups
├── calories_calculator.py        # Nutritional data for ingredients
├── pdf_generator.py              # WeasyPrint PDF rendering
└── testdata/
    ├── testsSQLite.py            # Input validation helpers
    └── tests_verify_uid.py       # Unit tests for Firebase UID verification
```

---

## Database

### Schema

The PostgreSQL database contains seven tables:

- **usuarios** — registered users (Firebase UID stored as a SHA-256 hash)
- **recetas** — recipes with metadata (name, description, image, video, prep time, servings)
- **ingredientes** — ingredient catalog with nutritional data (kcal, protein, fat, carbs)
- **ingredientes_en_receta** — join table linking ingredients to recipes with quantity and unit
- **pasos_receta** — ordered preparation steps per recipe
- **tips_receta** — optional tips per recipe
- **usuarios_recetas_favoritos** — user–recipe favorites join table

All tables use `SERIAL PRIMARY KEY`, `TIMESTAMPTZ` timestamps (`fecha_creacion`, `fecha_modificacion`), and `ON DELETE CASCADE` / `ON DELETE SET NULL` foreign keys.

### Connection

All database access goes through the `get_connection()` context manager in `sqlite_CRUD_script.py`. It opens a `psycopg2` connection, commits on success, rolls back on any exception, and always closes the connection:

```python
@contextmanager
def get_connection():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    try:
        yield conn
        conn.commit()
    except:
        conn.rollback()
        raise
    finally:
        conn.close()
```

### Backup

Export all tables to timestamped JSON and/or CSV files:

```bash
python backup_db.py           # both formats
python backup_db.py json      # JSON only
python backup_db.py csv       # CSV only
```

Output is saved to `backups/YYYY-MM-DD_HH-MM-SS/`. Each run creates a new folder so backups never overwrite each other.

---

## Key Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Home page |
| `GET` | `/recetas` | All recipes (paginated) |
| `GET` | `/receta/<id>` | Single recipe detail |
| `GET` | `/receta/pdf/<id>` | Download recipe as PDF |
| `GET` | `/nuevareceta` | Create recipe form (auth required) |
| `POST` | `/api/recipes` | Submit new recipe |
| `GET/POST` | `/edit_receta/<id>` | Edit recipe |
| `GET` | `/saverecepy/<id>` | Toggle favorite |
| `GET` | `/perfil/<uid>` | User profile |
| `POST` | `/api/user` | Firebase login/logout |
| `GET/POST` | `/access` | Admin login |
| `GET` | `/dashboard` | Admin dashboard |

---

## APIs Used

### Firebase Authentication (client-side)

Firebase is used exclusively on the frontend via the Firebase JS SDK. After sign-in, the client sends the user's UID and `emailVerified` flag to the Flask backend:

```
POST /api/user
Content-Type: application/json

{ "uid": "<firebase-uid>", "emailVerified": true }
```

The server stores the UID in a Flask session. On logout, the client sends `{ "uid": null }` to the same endpoint, which clears the session.

---

### POST Protection — CSRF vs. Session Auth

The app uses two independent mechanisms to protect state-changing requests.

#### CSRF Protection (flask-wtf)

`CSRFProtect(app)` applies globally to every non-exempt POST/PUT/DELETE route. Jinja2 renders a hidden token into `<meta name="csrf-token">`. JavaScript reads that token and attaches it as an `X-CSRFToken` header on every `fetch` call:

```js
const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

fetch("/api/recipes", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
  body: JSON.stringify(recipeData)
});
```

**Exception:** `/api/user` is decorated with `@csrf.exempt` because it is the login/logout endpoint called before a CSRF token has been issued.

#### Session-Based Auth

After a successful `/api/user` call, Flask stores identity data in a signed cookie:

```python
session["uid"]            # Firebase UID (SHA-256 hashed in the DB)
session["email_verified"] # whether Firebase confirmed the email
session["user_loggedin"]  # convenience boolean
session["sql_user_id"]    # row ID in the usuarios table
```

A `before_request` hook copies this into `flask.g` on every request. Routes protect themselves via:

| Mechanism | Where used | Effect |
|---|---|---|
| `@login_required` | `GET /saverecepy/<id>`, `GET /perfil/<uid>` | Redirects to `/` if `g.user` is `None` |
| `@email_verified_required` | `GET /nuevareceta` | Redirects to `/` unless `g.user["email_verified"]` is `True` |
| Inline session check | `POST /api/recipes` | Returns `403` if not logged in |

#### Key Difference

| | CSRF token | Session auth |
|---|---|---|
| **Threat** | Cross-site request forgery | Unauthenticated access |
| **Checks** | Per-session cryptographic token on every mutating request | Identity stored in session after login |
| **Failure** | `400 Bad Request` | `302` redirect or `403 JSON` |

---

### Web Speech API — Recipe Audio Player

The recipe detail page includes a step-by-step audio player in [static/scripts/player.js](static/scripts/player.js) using the browser-native [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API). No external service is called — synthesis happens entirely in the browser.

**Voice selection** — picks a voice matching the page's `lang` attribute (`es` by default), falls back to any voice with the same language prefix.

**Text chunking** — splits steps into ≤160-character chunks (on word boundaries) to work around browser limits on utterance length.

**State machine** — tracks `idle`, `playing`, `paused` states and exposes `play(index)`, `pause()`, `resume()`, and `next()`.

---

### WeasyPrint — PDF Generation

PDF export is handled server-side in [pdf_generator.py](pdf_generator.py). The route `/receta/pdf/<id>` renders the recipe into the `receta_pdf.html` Jinja2 template and passes the HTML string to `generate_pdf()`, which calls `HTML(string=html).write_pdf()`.

**Windows note:** WeasyPrint requires the GTK3 runtime on Windows. Without it the app starts normally but the PDF route returns a 500 with a clear error message pointing to the [installation guide](https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases).

---

## Admin Access

Navigate to `/access` and enter the password set in `PASS_KEY_ADMIN`. The dashboard lets you view and delete records across all tables.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Follow the existing code style (snake_case functions, blueprint-per-feature organization).
3. Validate all user input using the helpers in [testdata/testsSQLite.py](testdata/testsSQLite.py).
4. Open a pull request with a clear description of the change.

---

## Support

Open an issue on the repository for bug reports or feature requests.
