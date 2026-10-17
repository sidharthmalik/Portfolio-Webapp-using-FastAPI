# Portfolio Webapp using FastAPI

A personal data science portfolio built with **FastAPI**. Instead of static project write-ups, it includes live, interactive demos you can run in the browser.

**Live ML demo:** [Lead Scorer on Hugging Face Spaces](https://huggingface.co/spaces/SidharthMalik/lead-in-and-auto-followup-system)

## Features
- 🏠 Home and project showcase pages (Jinja2 templates)
- 🧪 **Live Lab** (`/lab`): SQL playground, customer segmentation (RFM and K-Means), lead scoring and a movie recommender, all running in the browser with nothing to install
- 🎯 **Lead Scorer** (`/projects/lead-scorer`): a Gradient Boosting model served from Hugging Face Spaces and embedded in the site
- 🔌 API endpoints for server-side features such as outreach email drafting
- 📊 Auto-generated interactive API docs via Swagger UI (`/docs`)
- 🎨 Responsive dark UI with a custom design system
- ⚡ Fast, async-ready backend

## Tech Stack
- **Backend:** FastAPI, Uvicorn
- **Templating:** Jinja2
- **ML:** scikit-learn (Gradient Boosting lead scorer), served on Hugging Face Spaces with Gradio
- **Frontend:** HTML, CSS, vanilla JavaScript

## Project Structure
```
portfolio/
├── main.py                     # FastAPI app entry point
├── README.md
├── requirements.txt
├── .gitignore
├── routers/
│   ├── __init__.py
│   ├── pages.py                # Page routes, profile data, PROJECTS list
│   └── api.py                  # API endpoints
├── templates/
│   ├── base.html
│   ├── index.html
│   ├── projects.html           # Project cards, built from PROJECTS in pages.py
│   ├── lab.html                # Live Lab (SQL, segmentation, lead scoring, movies)
│   └── lead_scorer.html        # Lead Scorer page embedding the Hugging Face demo
└── static/
    ├── main.js
    ├── style.css
    ├── css/                    # Live Lab styles
    ├── js/
    │   ├── project-links.js    # Links project cards to their live demos
    │   └── lab-*.js            # Live Lab demo scripts
    ├── data/                   # Datasets used by the Live Lab demos
    └── images/
```

## Running Locally
```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Visit `http://127.0.0.1:8000` for the site, `/lab` for the Live Lab, or `/docs` for the interactive API playground.

## Adding a Project
1. Add an entry to the `PROJECTS` list in `routers/pages.py`.
2. To link its card to a live demo, add a matching entry to the `DEMOS` list in `static/js/project-links.js`.

## Notes
- Secrets such as API keys belong in a `.env` file, which is git-ignored. Never commit them.
- The Lead Scorer model is trained on rule-generated labels and designed to be retrained with real outcome feedback.
