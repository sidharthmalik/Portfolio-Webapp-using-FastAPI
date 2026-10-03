# Portfolio Webapp using FastAPI

A personal portfolio built with **FastAPI**, designed to go beyond static project write-ups by including live, interactive ML demos.

## Features
- 🏠 Home & project showcase pages (Jinja2 templates)
- 🔌 REST API endpoints for live model predictions (e.g., lead scoring)
- 📊 Auto-generated interactive API docs via Swagger UI (`/docs`)
- 🎨 Clean, responsive frontend with HTML/CSS/JS
- ⚡ Fast, async-ready backend

## Tech Stack
- **Backend:** FastAPI, Uvicorn
- **Templating:** Jinja2
- **ML:** scikit-learn / PyTorch (model serving)
- **Frontend:** HTML, CSS, Python

## Project Structure
\`\`\`
portfolio/
├── main.py
├── routers/
├── templates/
├── static/
└── models/
\`\`\`

## Running Locally
\`\`\`bash
pip install -r requirements.txt
uvicorn main:app --reload
\`\`\`

Visit `http://127.0.0.1:8000` to view the site, or `/docs` for the interactive API playground.
