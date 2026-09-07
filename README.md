# 📸 Joy Photography

A modern, responsive photography portfolio website built to showcase photographs through a clean editorial-style interface with an interactive gallery, collections, fullscreen viewing, and a secure admin dashboard.

The project uses **Flask** for the backend and **Supabase PostgreSQL + Storage** for production data and image storage.

🌐 **Live Website:** https://photography-website-joy.vercel.app/

---

## ✨ Features

### 📷 Photography Gallery
- 170+ photographs
- Multiple photography collections
- Portrait and Landscape filters
- Featured photographs
- Collection-based filtering
- Responsive masonry-style gallery
- Fullscreen image lightbox
- Smooth image transitions

### 🎨 Modern Design
- Minimal editorial photography aesthetic
- Responsive desktop, tablet, and mobile layouts
- Animated solar-system inspired background
- Scroll-reactive visual effects
- Smooth navigation and interactions
- Optimized image loading

### 🔐 Admin Dashboard
- Password-protected admin area
- Upload new photographs
- Add photograph metadata
- Featured photograph management
- Collection/category management
- Persistent admin password
- Secure server-side authentication

### ☁️ Cloud Storage
- Supabase PostgreSQL database
- Supabase Storage for photographs
- Public image delivery through Supabase Storage
- Persistent gallery data
- Production-ready cloud architecture

### 🚀 Deployment
- Deployed on Vercel
- Flask backend running in production
- Supabase used as the production database and storage layer
- Environment variables used for sensitive credentials
- SQLite used as the local development fallback

---

## 🛠️ Tech Stack

### Backend
- Python
- Flask
- Werkzeug
- Pillow

### Database & Storage
- PostgreSQL
- Supabase
- Supabase Storage

### Frontend
- HTML5
- CSS3
- JavaScript
- Responsive Web Design

### Deployment & Tools
- Git
- GitHub
- Vercel
- Supabase
- Python Virtual Environment

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │      Visitor        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Vercel        │
                    │   Flask Application  │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
       ┌──────────────────┐        ┌──────────────────┐
       │ Supabase         │        │ Supabase Storage │
       │ PostgreSQL       │        │    Photos        │
       │                  │        │                  │
       │ Gallery Metadata │        │ Image Files      │
       │ Admin Settings   │        │                  │
       └──────────────────┘        └──────────────────┘
