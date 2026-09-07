# Joy Photography — Modern Portfolio

A responsive photography portfolio built with Flask, with a local SQLite mode for development and a production-ready Supabase mode for Vercel.

## Highlights

- Cinematic responsive portfolio
- Animated ambient background + scroll reveals
- Hero parallax on desktop/mobile-safe fallback
- 10 photos initially, then **Show more +10**
- Portrait / Landscape format filtering
- Collection filtering
- Fullscreen lightbox with keyboard + touch swipe
- Admin upload, edit, feature/unfeature and delete
- Supabase PostgreSQL + Storage support
- Vercel-ready Flask entrypoint
- Local SQLite fallback for easy testing

## Local test

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000`.

Admin: `http://127.0.0.1:5000/admin`

Default local admin password is `admin123` unless `ADMIN_PASSWORD` is set.

## Supabase + Vercel

1. Create a Supabase project.
2. Run `supabase_schema.sql` in the Supabase SQL Editor.
3. Create a **public Storage bucket named `photos`**.
4. Set Vercel environment variables:
   - `SECRET_KEY`
   - `ADMIN_PASSWORD`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_BUCKET=photos`
5. Push the project to GitHub and import it into Vercel.
6. Run `python scripts/migrate_to_supabase.py` once locally to upload the existing gallery.

**Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend JavaScript.** It is server-only.

### Local/Supabase behavior

Without Supabase environment variables, the app uses the included SQLite database and local media so you can test the design offline. Once the Supabase variables are present, the app reads/writes the Supabase database and Storage bucket instead.

### V6 performance
The cinematic background is CSS-only and the DSLR assembly uses a single requestAnimationFrame scroll loop with transform-only updates. The site also honors `prefers-reduced-motion` for accessibility.

### Admin password
The admin password can now be changed from **Admin → Change password**. Passwords are stored as secure hashes in the local SQLite database or the Supabase `admin_settings` table. On a fresh install, the `ADMIN_PASSWORD` environment variable is used as the first-run password. For Supabase deployments, run the latest `supabase_schema.sql` once before using the password settings.

### Gallery order
The public gallery intentionally starts with the elephant portrait (`new-10.jpeg`), followed by the original featured frame, then the remaining archive.
