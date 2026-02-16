"""Main application entry point for the FastAPI server."""

import asyncio
import os
from contextlib import asynccontextmanager

import fastapi_users
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import (
    prometheus_router,
    database_category_router,
    database_inventory_router,
    database_layouts_router,
    database_rack_router,
    database_shelf_router,
    database_machine_router,
    database_metadata_router,
    database_rental_router,
    database_room_router,
    database_team_router,
    database_user_router,
    database_history_router,
    database_documentation_router,
    database_tags_router,
    ansible_router,
    dashboard_router,
    authentication_router,
    labs_router,
    subpage_history_router,
)
from app.routers.prometheus_router import metrics_worker, status_worker
from app.database import SessionLocal
from app.utils.database_service import init_super_user, init_virtual_lab, init_document

# pylint: disable=unused-import
import app.db.listeners

from app.auth.auth_config import auth_backend
from app.db.schemas import UserRead
from app.db.schemas import UserUpdate
from app.auth.auth_config import fastapi_users


@asynccontextmanager
async def lifespan(fast_api_app: FastAPI):  # pylint: disable=unused-argument
    """
    Application lifespan context manager.
    Starts background tasks for fetching Prometheus metrics.
    :param app: FastAPI application instance
    :return: None
    """
    db = SessionLocal()
    try:
        init_super_user(db)
        init_virtual_lab(db)
        init_document(db)
    finally:
        db.close()
    status_task = asyncio.create_task(status_worker())
    metrics_task = asyncio.create_task(metrics_worker())
    try:
        yield
    finally:
        status_task.cancel()
        metrics_task.cancel()
        await asyncio.gather(status_task, metrics_task, return_exceptions=True)


app = FastAPI(lifespan=lifespan)

# Mount static files for user avatars
if not os.path.exists(database_user_router.AVATAR_DIR):
    os.makedirs(database_user_router.AVATAR_DIR, exist_ok=True)
app.mount(
    "/static/avatars",
    StaticFiles(directory=database_user_router.AVATAR_DIR),
    name="avatars",
)

# Configure CORS middleware temporaryly for local development
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    fastapi_users.get_auth_router(auth_backend), prefix="/auth", tags=["auth"]
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)
app.include_router(prometheus_router.router)
app.include_router(database_category_router.router)
app.include_router(database_inventory_router.router)
app.include_router(database_layouts_router.router)
app.include_router(database_machine_router.router)
app.include_router(database_metadata_router.router)
app.include_router(database_rental_router.router)
app.include_router(database_room_router.router)
app.include_router(database_team_router.router)
app.include_router(database_user_router.router)
app.include_router(database_history_router.router)
app.include_router(ansible_router.router)
app.include_router(dashboard_router.router)
app.include_router(authentication_router.router)
app.include_router(labs_router.router)
app.include_router(database_documentation_router.router)
app.include_router(database_tags_router.router)
app.include_router(subpage_history_router.router)
app.include_router(database_rack_router.router)
app.include_router(database_shelf_router.router)
