from fastapi import APIRouter

from app.api.v1.admin.spreads import router as admin_spreads_router
from app.api.v1.admin.users import router as admin_users_router
from app.api.v1.auth import router as auth_router
from app.api.v1.spreads import router as spreads_router
from app.api.v1.users import router as users_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(spreads_router)
api_v1_router.include_router(admin_users_router)
api_v1_router.include_router(admin_spreads_router)
