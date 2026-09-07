#!/usr/bin/env bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
export SECRET_KEY="${SECRET_KEY:-change-me}"
python app.py
