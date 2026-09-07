import os
import sqlite3
import uuid
from functools import wraps
from pathlib import Path

from flask import Flask, render_template, request, redirect, url_for, session, flash, send_from_directory
from werkzeug.utils import secure_filename
from werkzeug.security import check_password_hash, generate_password_hash
from PIL import Image

try:
    from supabase import create_client
except ImportError:  # Supabase is optional for local-only mode.
    create_client = None

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "photography.db"
MEDIA_DIR = BASE_DIR / "media"
UPLOAD_DIR = MEDIA_DIR / "uploads"
ALLOWED = {"jpg", "jpeg", "png", "webp", "gif", "avif"}
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "photos").strip() or "photos"
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and create_client)
if not USE_SUPABASE:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder="public", static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "change-this-secret-key")
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024

_supabase = None
if USE_SUPABASE:
    _supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_local_db():
    conn = db()
    conn.execute("""CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'Other',
        filename TEXT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        featured INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        format TEXT NOT NULL DEFAULT 'Landscape'
    )""")
    cols = {r[1] for r in conn.execute("PRAGMA table_info(photos)").fetchall()}
    if "format" not in cols:
        conn.execute("ALTER TABLE photos ADD COLUMN format TEXT NOT NULL DEFAULT 'Landscape'")
    conn.execute("""CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        password_hash TEXT NOT NULL
    )""")

    for row in conn.execute("SELECT id, filename FROM photos").fetchall():
        path = MEDIA_DIR / row[1]
        try:
            with Image.open(path) as im:
                fmt = "Portrait" if im.height > im.width else "Landscape"
            conn.execute("UPDATE photos SET format=? WHERE id=?", (fmt, row[0]))
        except Exception:
            pass

    if conn.execute("SELECT COUNT(*) FROM photos").fetchone()[0] == 0:
        existing = []
        root = MEDIA_DIR / "album"
        if root.exists():
            for p in sorted(root.rglob("*")):
                if p.is_file() and p.suffix.lower().lstrip(".") in ALLOWED:
                    rel = p.relative_to(MEDIA_DIR).as_posix()
                    rel_lower = rel.lower()
                    category = (
                        "Portraits" if "portrait" in rel_lower else
                        "Landscape" if "landscape" in rel_lower else
                        "Featured"
                    )
                    try:
                        with Image.open(p) as im:
                            fmt = "Portrait" if im.height > im.width else "Landscape"
                    except Exception:
                        fmt = "Landscape"
                    existing.append((
                        p.stem.replace("_", " ").replace("-", " ").title(),
                        category,
                        rel,
                        "",
                        1 if "featured" in p.name.lower() else 0,
                        len(existing),
                        fmt,
                    ))
        conn.executemany(
            "INSERT INTO photos(title,category,filename,caption,featured,sort_order,format) VALUES(?,?,?,?,?,?,?)",
            existing,
        )
        conn.commit()
    conn.close()


def get_supabase():
    if not USE_SUPABASE:
        raise RuntimeError("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
    return _supabase


def photo_url(filename):
    if USE_SUPABASE:
        return get_supabase().storage.from_(SUPABASE_BUCKET).get_public_url(filename)
    return url_for("media", filename=filename)


def normalize_photo(row):
    data = dict(row)
    data["photo_url"] = photo_url(data["filename"])
    return data


def _final_gallery_order(photos):
    """Keep Elephant Portrait II first, the original featured frame second, then every other photo."""
    elephant = next((p for p in photos if str(p.get("title", "")).strip().lower() == "elephant portrait ii"), None)
    featured = next((p for p in photos if str(p.get("filename", "")).endswith("/0001.webp") or p.get("filename") == "album/featured.jpg"), None)
    reserved = {id(p) for p in (elephant, featured) if p}
    rest = [p for p in photos if id(p) not in reserved]
    return ([elephant] if elephant else []) + ([featured] if featured else []) + rest


def fetch_photos():
    if USE_SUPABASE:
        response = (
            get_supabase()
            .table("photos")
            .select("*")
            .order("featured", desc=True)
            .order("sort_order", desc=True)
            .order("id", desc=True)
            .execute()
        )
        return _final_gallery_order([normalize_photo(row) for row in (response.data or [])])

    conn = db()
    rows = conn.execute("SELECT * FROM photos ORDER BY featured DESC, sort_order DESC, id DESC").fetchall()
    conn.close()
    return _final_gallery_order([normalize_photo(row) for row in rows])


def fetch_categories():
    photos = fetch_photos()
    return sorted({p["category"] for p in photos if p.get("category")})


def get_admin_password_hash():
    """Return the persistent admin password hash, with ADMIN_PASSWORD as first-run fallback."""
    if USE_SUPABASE:
        try:
            rows = get_supabase().table("admin_settings").select("password_hash").eq("id", 1).limit(1).execute().data or []
            return rows[0]["password_hash"] if rows else None
        except Exception:
            return None
    conn = db()
    conn.execute("CREATE TABLE IF NOT EXISTS admin_settings (id INTEGER PRIMARY KEY CHECK (id = 1), password_hash TEXT NOT NULL)")
    row = conn.execute("SELECT password_hash FROM admin_settings WHERE id=1").fetchone()
    conn.close()
    return row[0] if row else None


def set_admin_password(password):
    password_hash = generate_password_hash(password, method="scrypt")
    if USE_SUPABASE:
        get_supabase().table("admin_settings").upsert({"id": 1, "password_hash": password_hash}).execute()
        return
    conn = db()
    conn.execute("CREATE TABLE IF NOT EXISTS admin_settings (id INTEGER PRIMARY KEY CHECK (id = 1), password_hash TEXT NOT NULL)")
    conn.execute("INSERT INTO admin_settings(id,password_hash) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash", (password_hash,))
    conn.commit()
    conn.close()


def admin_password_matches(password):
    stored = get_admin_password_hash()
    if stored:
        try:
            return check_password_hash(stored, password)
        except ValueError:
            return False
    return password == os.environ.get("ADMIN_PASSWORD", "admin123")


def ensure_first_run_admin_password():
    if not get_admin_password_hash():
        fallback = os.environ.get("ADMIN_PASSWORD", "admin123")
        if fallback:
            set_admin_password(fallback)


def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("admin"):
            return redirect(url_for("admin_login", next=request.path))
        return f(*args, **kwargs)
    return wrapper


@app.context_processor
def inject():
    return {"is_admin": bool(session.get("admin")), "storage_mode": "Supabase" if USE_SUPABASE else "Local"}


@app.route("/")
def home():
    photos = fetch_photos()
    categories = sorted({p["category"] for p in photos if p.get("category")})
    # Keep the original featured butterfly photo in the gallery, but use a calmer
    # landscape as the landing hero so the homepage has a fresh first impression.
    preferred_hero = next((p for p in photos if p.get("filename") == "album/landscape/14.jpg"), None)
    hero_photo = preferred_hero or (photos[0] if photos else None)
    return render_template("home.html", photos=photos, categories=categories, hero_photo=hero_photo)


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        password = request.form.get("password", "")
        if admin_password_matches(password):
            try:
                ensure_first_run_admin_password()
            except Exception:
                pass
            session["admin"] = True
            return redirect(request.args.get("next") or url_for("admin"))
        flash("Incorrect password.", "error")
    return render_template("login.html")


@app.route("/admin/settings", methods=["GET", "POST"])
@admin_required
def admin_settings():
    if request.method == "POST":
        current = request.form.get("current_password", "")
        new_password = request.form.get("new_password", "")
        confirm = request.form.get("confirm_password", "")
        if not admin_password_matches(current):
            flash("Current password is incorrect.", "error")
        elif len(new_password) < 8:
            flash("New password must be at least 8 characters.", "error")
        elif new_password != confirm:
            flash("New passwords do not match.", "error")
        else:
            try:
                set_admin_password(new_password)
                flash("Admin password changed successfully.", "success")
            except Exception as exc:
                flash(f"Could not change password: {exc}", "error")
        return redirect(url_for("admin_settings"))
    return render_template("admin_settings.html")


@app.route("/admin/logout")
def admin_logout():
    session.clear()
    return redirect(url_for("home"))


@app.route("/admin")
@admin_required
def admin():
    photos = fetch_photos()
    stats = {
        "total": len(photos),
        "featured": sum(1 for p in photos if p.get("featured")),
        "categories": len({p["category"] for p in photos}),
    }
    return render_template("admin.html", photos=photos, stats=stats)


@app.post("/admin/upload")
@admin_required
def upload():
    category = request.form.get("category", "Other").strip() or "Other"
    title = request.form.get("title", "").strip()
    caption = request.form.get("caption", "").strip()
    featured = bool(request.form.get("featured"))
    files = request.files.getlist("photos")

    if USE_SUPABASE:
        supabase = get_supabase()
        existing = supabase.table("photos").select("sort_order").order("sort_order", desc=True).limit(1).execute().data or []
        order = int(existing[0]["sort_order"]) + 1 if existing else 0
        added = 0
        for f in files:
            if not f or not f.filename:
                continue
            safe = secure_filename(f.filename)
            ext = Path(safe).suffix.lower().lstrip(".")
            if ext not in ALLOWED:
                continue
            name = f"{uuid.uuid4().hex}.{ext}"
            storage_path = f"gallery/{name}"
            f.stream.seek(0)
            try:
                with Image.open(f.stream) as im:
                    fmt = "Portrait" if im.height > im.width else "Landscape"
                f.stream.seek(0)
                supabase.storage.from_(SUPABASE_BUCKET).upload(
                    storage_path,
                    f.stream.read(),
                    {"content-type": f.mimetype or "image/jpeg", "cache-control": "31536000", "upsert": "false"},
                )
                photo_title = title or Path(safe).stem.replace("_", " ").replace("-", " ").title()
                supabase.table("photos").insert({
                    "title": photo_title,
                    "category": category,
                    "filename": storage_path,
                    "caption": caption,
                    "featured": featured,
                    "sort_order": order,
                    "format": fmt,
                }).execute()
                order += 1
                added += 1
            except Exception as exc:
                flash(f"Upload failed for {safe}: {exc}", "error")
        flash(f"{added} photo(s) added to your Supabase gallery.", "success")
        return redirect(url_for("admin"))

    conn = db()
    order = conn.execute("SELECT COALESCE(MAX(sort_order),0)+1 FROM photos").fetchone()[0]
    added = 0
    for f in files:
        if not f or not f.filename:
            continue
        safe = secure_filename(f.filename)
        ext = Path(safe).suffix.lower().lstrip(".")
        if ext not in ALLOWED:
            continue
        name = f"{uuid.uuid4().hex}.{ext}"
        rel = f"uploads/{name}"
        try:
            with Image.open(f.stream) as im:
                fmt = "Portrait" if im.height > im.width else "Landscape"
            f.stream.seek(0)
        except Exception:
            fmt = "Landscape"
            f.stream.seek(0)
        f.save(UPLOAD_DIR / name)
        photo_title = title or Path(safe).stem.replace("_", " ").replace("-", " ").title()
        conn.execute(
            "INSERT INTO photos(title,category,filename,caption,featured,sort_order,format) VALUES(?,?,?,?,?,?,?)",
            (photo_title, category, rel, caption, int(featured), order, fmt),
        )
        order += 1
        added += 1
    conn.commit()
    conn.close()
    flash(f"{added} photo(s) added to your local gallery.", "success")
    return redirect(url_for("admin"))


@app.post("/admin/photo/<int:photo_id>/toggle")
@admin_required
def toggle_featured(photo_id):
    if USE_SUPABASE:
        row = get_supabase().table("photos").select("featured").eq("id", photo_id).single().execute().data
        if row:
            get_supabase().table("photos").update({"featured": not bool(row["featured"])}).eq("id", photo_id).execute()
    else:
        conn = db()
        conn.execute("UPDATE photos SET featured = CASE featured WHEN 1 THEN 0 ELSE 1 END WHERE id=?", (photo_id,))
        conn.commit()
        conn.close()
    return redirect(url_for("admin"))


@app.post("/admin/photo/<int:photo_id>/delete")
@admin_required
def delete_photo(photo_id):
    if USE_SUPABASE:
        row = get_supabase().table("photos").select("filename").eq("id", photo_id).single().execute().data
        if row:
            try:
                get_supabase().storage.from_(SUPABASE_BUCKET).remove([row["filename"]])
            except Exception:
                pass
            get_supabase().table("photos").delete().eq("id", photo_id).execute()
    else:
        conn = db()
        row = conn.execute("SELECT filename FROM photos WHERE id=?", (photo_id,)).fetchone()
        if row:
            if row["filename"].startswith("uploads/"):
                p = MEDIA_DIR / row["filename"]
                if p.exists():
                    p.unlink()
            conn.execute("DELETE FROM photos WHERE id=?", (photo_id,))
            conn.commit()
        conn.close()
    return redirect(url_for("admin"))


@app.post("/admin/photo/<int:photo_id>/edit")
@admin_required
def edit_photo(photo_id):
    title = request.form.get("title", "").strip()
    category = request.form.get("category", "Other").strip() or "Other"
    caption = request.form.get("caption", "").strip()
    if USE_SUPABASE:
        get_supabase().table("photos").update({"title": title, "category": category, "caption": caption}).eq("id", photo_id).execute()
    else:
        conn = db()
        conn.execute("UPDATE photos SET title=?, category=?, caption=? WHERE id=?", (title, category, caption, photo_id))
        conn.commit()
        conn.close()
    return redirect(url_for("admin"))


@app.route("/media/<path:filename>")
def media(filename):
    return send_from_directory(MEDIA_DIR, filename)


@app.route("/health")
def health():
    return {"status": "ok", "storage": "supabase" if USE_SUPABASE else "local"}


# Vercel looks for a top-level Flask instance named `app`.
if __name__ == "__main__":
    init_local_db()
    app.run(debug=True, host="127.0.0.1", port=5000)
