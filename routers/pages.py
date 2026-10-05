from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="templates")

PROFILE = {
    "name": "Sidharth Malik",
    "title": "Data Analyst",
    "tagline": "I turn messy data into decisions, with SQL, Python, Power BI and machine learning.",
    "skills": [
        "SQL", "Python", "Power BI", "Tableau",
        "scikit-learn", "PyTorch", "Pandas", "Data Visualization",
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
        "desc": "RFM analysis and K-Means clustering on the Online Retail II dataset, with an interactive Tableau dashboard.",
        "tags": ["Python", "K-Means", "Tableau"],
        "link": "#",
    },
    {
        "name": "Superstore SQL Analysis",
        "desc": "End-to-end business analysis of Superstore sales data using MySQL queries.",
        "tags": ["MySQL", "SQL", "EDA"],
        "link": "#",
    },
]


@router.get("/")
def home(request: Request):
    return templates.TemplateResponse(
        request, "index.html", {"profile": PROFILE, "projects": PROJECTS[:3]}
    )


@router.get("/projects")
def projects(request: Request):
    return templates.TemplateResponse(
        request, "projects.html", {"projects": PROJECTS}
    )


@router.get("/contact")
def contact(request: Request):
    return templates.TemplateResponse(request, "contact.html", {"profile": PROFILE})