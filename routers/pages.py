from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.get("/")
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@router.get("/projects")
def projects(request: Request):
    project_list = [
        {
            "name": "Growzyn Lead Scoring",
            "desc": "ML-based lead prioritization system for B2B outreach automation.",
        },
        {
            "name": "Sales Forecast Dashboard",
            "desc": "Power BI + Python forecasting pipeline for sales trend analysis.",
        },
    ]
    return templates.TemplateResponse(
        "projects.html", {"request": request, "projects": project_list}
    )