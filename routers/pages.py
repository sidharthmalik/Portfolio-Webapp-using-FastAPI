from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="templates")

# ---------- EDIT YOUR DETAILS HERE ----------
PROFILE = {
    "name": "Sidharth Malik",
    "first": "Sidharth",
    "last": "Malik",
    "title": "Data Scientist",
    "year": "2026",
    "tagline": "I turn messy data into clear decisions.",
    # <b>...</b> words turn lime on the page
    "message":"I build things that <b>solve problems</b>, <b>automate workflows</b>, and <b>create value</b>. From <b>data-driven decisions</b> to <b>AI-powered products</b>, I'm here to <b>turn ideas into reality</b>.",
"quote": "Good analysis isn't about having more data. It's about asking better questions.",
    "about": "Analyst by training, builder by habit. I use SQL, Python and BI tools to find the story inside the numbers.",
    "location": "India",
    "email": "sidharthmalik000@gmail.com",
    "linkedin": "https://www.linkedin.com/in/sidharth-malik-66ba83291/",
    "github": "https://github.com/sidharthmalik",
    "photo":"https://x.com/sidharthmalik01uvicorn main:app --reload",  # e.g. "/static/images/me.png" (a cut-out PNG looks best)
    "skills": [
        {"name": "SQL", "kind": "Querying"},
        {"name": "Python", "kind": "Programming"},
        {"name": "Power BI", "kind": "Dashboards"},
        {"name": "Tableau", "kind": "Dashboards"},
        {"name": "scikit-learn", "kind": "Machine learning"},
        {"name": "PyTorch", "kind": "Deep learning basics"},
        {"name": "Pandas", "kind": "Data wrangling"},
        {"name": "Data Viz", "kind": "Storytelling"},
    ],
    "education": [
        {"degree": "MCA, Data Science", "note": "In progress"},
        {"degree": "BBA, Business Analytics", "note": "Completed"},
    ],
}

PROJECTS = [
    {
        "name": "Lead gen with auto email follow-ups system",
        "desc": "ML-based lead prioritization system for B2B outreach automation.",
        "tags": ["Python", "scikit-learn", "Automation"],
        "link": "#",
    },
   
    
    {
        "name": "Customer Segmentation",
        "desc": "RFM analysis and K-Means clustering on the Online Retail II dataset, with a Tableau dashboard.",
        "tags": ["Python", "K-Means", "Tableau"],
        "link": "#",
    },
]
# --------------------------------------------


@router.get("/")
def home(request: Request):
    return templates.TemplateResponse(
        request, "index.html", {"profile": PROFILE, "projects": PROJECTS}
    )


@router.get("/projects")
def projects(request: Request):
    return templates.TemplateResponse(
        request, "projects.html", {"profile": PROFILE, "projects": PROJECTS}
    )


@router.get("/contact")
def contact(request: Request):
    return templates.TemplateResponse(
        request, "contact.html", {"profile": PROFILE}
    )
    
    
    
from fastapi import Request
from fastapi.responses import HTMLResponse

@router.get("/lab", response_class=HTMLResponse)
async def lab(request: Request):
    return templates.TemplateResponse(request, "lab.html")