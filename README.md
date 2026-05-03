# Boo-Juice

A recipe sharing and management web application built with Flask and SQLite. Users can browse, create, edit, and save recipes, calculate nutritional information, and export recipes as PDFs. An admin dashboard provides full data management capabilities.

---

## Features

- **Recipe browsing** — paginated listing with cover images and previews
- **Recipe detail pages** — ingredients, step-by-step instructions, tips, video, and nutrition data
- **Recipe creation & editing** — authenticated users can submit and manage their own recipes
- **Favorites** — save recipes to a personal profile
- **Calorie calculator** — per-ingredient nutritional breakdown using a built-in dataset
- **PDF export** — download any recipe as a formatted PDF (powered by Playwright)
- **Firebase authentication** — email-verified login required to post content
- **Admin dashboard** — password-protected interface to manage users, recipes, and ingredients

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask, SQLite |
| Auth | Firebase (client-side) |
| PDF | Playwright (headless Chromium) |
| Frontend | Jinja2 templates, Vite-compiled assets, vanilla JS |
| Environment | python-dotenv |

---

## Getting Started

### Prerequisites

- Python 3.10+
- [Playwright](https://playwright.dev/python/) browsers installed
- A Firebase project with email/password auth enabled
- A Firebase service account JSON key (for server-side UID verification)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd flask

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install flask python-dotenv playwright werkzeug firebase-admin
playwright install chromium
```

### Environment variables

Create a `.env` file in the project root (`Boo-Juice/`):

```env
FLASK_SECRET_KEY=your-secret-key-here
PASS_KEY_ADMIN=your-admin-password-here
FIREBASE_SERVICE_ACCOUNT_PATH=../serviceAccount.json
```

`FIREBASE_SERVICE_ACCOUNT_PATH` must point to a Firebase service account JSON file. Download it from **Firebase Console → Project Settings → Service Accounts → Generate new private key**. Keep this file out of version control — it is already listed in `.gitignore`.

### Initialize the database

```bash
python sqlite_create_db.py
```

This creates `recetas.db` with all required tables and relationships.

### Run the development server

```bash
flask --app app run --debug
```

The app will be available at `http://127.0.0.1:5000`.

---

## Project Structure

```
flask/
├── app.py                    # Application factory and core routes
├── routes/
│   ├── showrecepies.py       # Recipe display and user-facing CRUD routes
│   └── adminCrud.py          # Admin dashboard blueprint
├── templates/                # Jinja2 HTML templates
├── static/
│   ├── scripts/              # Client-side JavaScript
│   ├── styles/               # CSS stylesheets
│   └── assets/               # Images and Vite-compiled frontend bundles
├── sqlite_create_db.py       # Database schema initialization
├── sqlite_CRUD_script.py     # Database query helpers
├── calories_calculator.py    # Nutritional data for ingredients
├── pdf_generator.py          # Playwright PDF rendering
└── testdata/
    ├── testsSQLite.py        # Input validation helpers
    └── tests_verify_uid.py   # Unit tests for Firebase UID verification and /api/user route
```

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

## Database Schema

The SQLite database contains six tables:

- **usuarios** — registered users (Firebase UID stored as a SHA-256 hash)
- **recetas** — recipes with metadata (name, description, image, video, prep time, servings)
- **ingredientes** — ingredient catalog with nutritional data (kcal, protein, fat, carbs)
- **ingredientes_en_receta** — join table linking ingredients to recipes with quantity and unit
- **pasos_receta** — ordered preparation steps per recipe
- **tips_receta** — optional tips per recipe
- **usuarios_recetas_favoritos** — user–recipe favorites join table

All tables include `fecha_creacion` and `fecha_modificacion` timestamps. Foreign keys are enforced with `CASCADE` deletes.

---

## APIs Used

### Firebase Authentication (client-side)

Firebase is used exclusively on the frontend via the Firebase JS SDK. After sign-in, the client sends the user's UID and `emailVerified` flag to the Flask backend:

```
POST /api/user
Content-Type: application/json

{ "uid": "<firebase-uid>", "emailVerified": true }
```

The server stores the UID in a Flask session. No Firebase Admin SDK is used — all token validation is handled implicitly by trusting the client-reported UID within the session. Email verification is required to access protected routes such as recipe creation.

On logout, the client sends `{ "uid": null }` to the same endpoint, which clears the session.

---

### POST Protection — CSRF vs. Session Auth

The app uses two independent mechanisms to protect state-changing requests. They guard against different threats and operate at different layers.

#### CSRF Protection (flask-wtf)

`CSRFProtect(app)` is initialized in `app.py` and applies globally to every non-exempt POST/PUT/DELETE route. On each page load, Jinja2 renders a hidden token into the `<meta name="csrf-token">` tag inside `layout.html`. JavaScript reads that token and attaches it as an `X-CSRFToken` request header on every `fetch` call:

```js
// static/scripts/new_recepy_form.js
const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

fetch("/api/recipes", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
  body: JSON.stringify(recipeData)
});
```

Flask-WTF validates the header server-side and rejects any request that omits it or supplies a token that does not match the one stored in the session. This defeats **cross-site request forgery**: an attacker's page cannot read the token from a different origin, so it cannot forge a valid request even if the victim's session cookie is automatically sent by the browser.

**Exception:** `/api/user` is decorated with `@csrf.exempt` because it is the login/logout endpoint called by the Firebase Vue widget before a CSRF token has been issued.

#### Session-Based Auth

Session auth answers a different question: *is the requester actually logged in?* After a successful `/api/user` call, Flask stores identity data in a server-side signed cookie:

```python
session["uid"]            # Firebase UID (SHA-256 hashed in the DB)
session["email_verified"] # whether Firebase confirmed the email
session["user_loggedin"]  # convenience boolean
session["sql_user_id"]    # row ID in the usuarios table
```

A `before_request` hook (`load_user_from_session` in `app.py`) copies this into `flask.g` on every request. Routes then protect themselves in one of three ways:

| Mechanism | Where used | Effect |
|---|---|---|
| `@login_required` decorator | `GET /saverecepy/<id>`, `GET /perfil/<uid>` | Redirects to `/` if `g.user` is `None` |
| `@email_verified_required` decorator | `GET /nuevareceta` | Redirects to `/` unless `g.user["email_verified"]` is `True` |
| Inline `session.get('user_loggedin')` check | `POST /api/recipes` | Returns `403` JSON error if not logged in |

Ownership is validated as a third check on the edit route: even an authenticated user is rejected with a `403` if `session["sql_user_id"]` does not match the `usuario_id` stored on the recipe row.

#### Key Difference

| | CSRF token | Session auth |
|---|---|---|
| **Threat it stops** | Cross-site request forgery (attacker forges a request using the victim's cookie) | Unauthenticated access (no valid session exists at all) |
| **What it checks** | A per-session cryptographic token attached to every mutating request | Identity data stored in the session after login |
| **Where it runs** | Flask-WTF middleware, before the route handler | `before_request` hook + per-route guards |
| **Failure response** | `400 Bad Request` | `302` redirect to `/` or `403 JSON` |

A request must pass **both** checks to succeed: the CSRF token confirms the request originated from this site's own page, and the session check confirms the user behind that page is actually logged in.

---

### Web Speech API — Recipe Audio Player

The recipe detail page includes a step-by-step audio player implemented in [static/scripts/player.js](static/scripts/player.js) using the browser-native [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API).

**How it works**

The player reads recipe preparation steps aloud using `window.speechSynthesis` and `SpeechSynthesisUtterance`. No external service is called — synthesis happens entirely in the browser using the voices installed on the operating system.

**Voice selection**

On load, the player reads the HTML `lang` attribute (`es` by default) and picks a matching voice from `speechSynthesis.getVoices()`. It prefers an exact locale match (`es-ES`, `en-US`) and falls back to any voice starting with the same language prefix. Because browsers load voices asynchronously, the player also listens for `speechSynthesis.onvoiceschanged` to re-run selection after the full voice list is available.

**Text chunking**

Some browsers silently drop or cut off utterances longer than ~200 characters. To work around this, the player splits each step's text into chunks of at most 160 characters (splitting on word boundaries) before queuing them. Each chunk is spoken sequentially via `speakChunk()` — the `onend` callback of one chunk triggers the next.

**State machine**

The player tracks three states — `idle`, `playing`, `paused` — and exposes four public methods:

| Method | Behavior |
|---|---|
| `play(index, steps)` | Starts speaking from the given step index. Cancels any ongoing speech first. Increments a `flowId` counter to discard stale callbacks from previous sessions. |
| `pause()` | Calls `speechSynthesis.pause()` and sets `isPausedManually = true` to prevent the chunk-end handler from advancing to the next chunk. |
| `resume()` | If the synthesizer is truly paused, calls `speechSynthesis.resume()`. If the speech already ended during the pause (a common browser race condition), restarts the current chunk via `speakChunk()`. |
| `next()` | Cancels current speech and starts the next step. Resets to `idle` if already on the last step. |

**UI synchronization**

`updateUI(state)` toggles the visibility of the Play / Pause / Resume buttons by adding or removing the `hidden` CSS class.

Individual step buttons (`.player-by-step`) let users jump directly to any step — each calls `SpeechController.play(index, steps)`.

**Speech rate**

All utterances are created with `u.rate = 0.9` (10 % slower than normal) to improve comprehension while following a recipe.

**Error handling**

The `onerror` handler on each `SpeechSynthesisUtterance` categorizes errors and responds accordingly:

| Error | Action |
|---|---|
| `canceled`, `interrupted` | Silently ignored (expected during play/pause transitions) |
| `audio-busy`, `audio-hardware`, `synthesis-unavailable`, `not-allowed` | Resets the player to `idle` |
| `network`, `synthesis-failed` | Cancels and retries the current step after 100 milliseconds |
| `language-unavailable`, `voice-unavailable` | Switches to the first available voice (`fallbackToDefaultVoice`) then retries |

---

### Playwright — PDF Generation

PDF export is handled server-side in [pdf_generator.py](pdf_generator.py) using [Playwright's Python sync API](https://playwright.dev/python/). A headless Chromium instance is started once at app startup (via `start_browser()` called in `app.py` after blueprint registration) and reused for all requests.

The route `/receta/pdf/<id>` renders the recipe into the `receta_pdf.html` Jinja2 template, passes the resulting HTML string to `generate_pdf()` in `pdf_generator.py`, which calls Playwright's `page.set_content()` and `page.pdf()` with A4 format, 1 cm margins, and a page-number footer. The raw PDF bytes are returned directly as `application/pdf`.

#### Thread-affinity problem and fix

**Problem:** Playwright's sync API is built on greenlets. When `sync_playwright().start()` is called, it creates a greenlet bound to the calling thread. Flask route handlers run in separate worker threads (or greenlets under gevent/eventlet), so any subsequent call to `browser.new_context()` from a route handler raises:

```
Cannot switch to a different thread
    Current:  <greenlet ... current active started main>
    Expected: <greenlet ... suspended active started main>
```

The original code made this worse by calling `start_browser()` inside a `before_request` hook — spawning a new browser instance on every request, leaking the previous one each time.

**Fix:** All Playwright operations are pinned to a single dedicated `ThreadPoolExecutor(max_workers=1)` defined in `pdf_generator.py`. Both `_init_browser()` (called once at startup via `start_browser()`) and `_do_generate_pdf()` (called per PDF request via `generate_pdf()`) are submitted to this executor, so Playwright always runs in the same thread where it was initialized. Flask routes call `generate_pdf(html)`, which submits the work to the executor and blocks until the result is ready.

---

## Admin Access

Navigate to `/access` and enter the password set in `PASS_KEY_ADMIN`. The dashboard lets you view, search, and delete records across all tables.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Follow the existing code style (snake_case functions, blueprint-per-feature organization).
3. Validate all user input using the helpers in [testdata/testsSQLite.py](testdata/testsSQLite.py).
4. Open a pull request with a clear description of the change.

---

## Support

Open an issue on the repository for bug reports or feature requests.
