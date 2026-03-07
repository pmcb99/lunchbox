from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.db import ensure_tables_exist

app = FastAPI(title="Lunchbox API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def check_db_tables(request: Request, call_next):
    ensure_tables_exist()
    response = await call_next(request)
    return response


@app.on_event("startup")
def startup() -> None:
    from app.db import init_db

    init_db()


app.include_router(api_router, prefix="/api/v1")
