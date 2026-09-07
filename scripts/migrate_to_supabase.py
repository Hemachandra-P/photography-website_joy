"""Upload the existing local gallery into Supabase.

Run from the project root after creating the `photos` Storage bucket and running
supabase_schema.sql:

  set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
  set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
  python scripts/migrate_to_supabase.py
"""
import os
import sqlite3
from pathlib import Path

from PIL import Image
from supabase import create_client

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "photography.db"
MEDIA = ROOT / "media"
URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
BUCKET = os.environ.get("SUPABASE_BUCKET", "photos")

client = create_client(URL, KEY)
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
rows = conn.execute("SELECT * FROM photos ORDER BY id").fetchall()

for row in rows:
    local = MEDIA / row["filename"]
    if not local.exists():
        print("SKIP missing:", local)
        continue
    ext = local.suffix.lower().lstrip(".") or "jpg"
    storage_path = f"gallery/{row['id']}-{local.stem}.{ext}"
    with open(local, "rb") as fh:
        data = fh.read()
    content_type = "image/jpeg" if ext in {"jpg", "jpeg"} else f"image/{ext}"
    client.storage.from_(BUCKET).upload(
        storage_path,
        data,
        {"content-type": content_type, "cache-control": "31536000", "upsert": "true"},
    )
    client.table("photos").upsert({
        "id": row["id"],
        "title": row["title"],
        "category": row["category"],
        "filename": storage_path,
        "caption": row["caption"],
        "featured": bool(row["featured"]),
        "sort_order": row["sort_order"],
        "created_at": row["created_at"],
        "format": row["format"],
    }).execute()
    print("OK:", row["id"], row["title"])

conn.close()
print(f"Migrated {len(rows)} records.")
