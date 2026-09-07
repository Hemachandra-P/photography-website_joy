@echo off
python -m venv .venv
call .venv\Scripts\activate
python -m pip install -r requirements.txt
set ADMIN_PASSWORD=admin123
set SECRET_KEY=change-me
python app.py
pause
