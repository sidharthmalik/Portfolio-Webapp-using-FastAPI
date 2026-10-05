from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="templates")

# ---------- EDIT YOUR DETAILS HERE ----------
PROFILE = {
    "name": "Sidharth Malik",
    "first": "Sidharth",
    "last": "Malik",
    "title": "Data Analyst",
    "year": "2026",
    "tagline": "I turn messy data into clear decisions.",
    # <b>...</b> words turn lime on the page
    "message": "<b>Turning</b> messy data into <b>decisions</b>, building models that <b>move</b> the numbers and shipping tools that <b>work</b> in the real world.",
    "quote": "Good analysis isn't about having more data. It's about asking better questions.",
    "about": "Analyst by training, builder by habit. I use SQL, Python and BI tools to find the story inside the numbers, and I run Growzyn, a B2B lead generation automation venture.",
    "location": "Haryana, India",
    "email": "your-email@example.com",
    "linkedin": "https://www.linkedin.com/in/your-handle",
    "github": "https://github.com/your-handle",
    "x": "https://x.com/your-handle",
    "photo": None,  # e.g. "/static/images/me.png" (a cut-out PNG looks best)
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
        "name": "Growzyn Lead Scoring",
        "desc": "ML-based lead prioritization system for B2B outreach automation.",
        "tags": ["Python", "scikit-learn", "Automation"],
        "link": "#",
    },
    {
        "name": "Sales Forecast Dashboard",
        "desc": "Power BI + Python forecasting pipeline for sales trend analysis.",
        "tags": ["Power BI", "Python", "Forecasting"],
        "link": "#",
    },
    {
        "name": "Customer Segmentation",
        "desc": "RFM analysis and K-Means clustering on the Online Retail II dataset, with a Tableau dashboard.",
        "tags": ["Python", "K-Means", "Tableau"],
        "link": "#",
    },
    {
        "name": "Superstore SQL Analysis",
        "desc": "End-to-end business analysis of Superstore sales data using MySQL.",
        "tags": ["MySQL", "SQL", "EDA"],
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