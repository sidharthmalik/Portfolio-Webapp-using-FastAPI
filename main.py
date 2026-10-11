from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from routers import pages

app = FastAPI(title="Sidharth's Portfolio")

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(pages.router)



from routers import pages,api

app.include_router(pages.router)
app.include_router(api.router)