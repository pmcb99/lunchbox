from fastapi import APIRouter

from app.api.api_v1.endpoints.lunchbox import router as lunchbox_router

api_router = APIRouter()
api_router.include_router(lunchbox_router, tags=["lunchbox"])
