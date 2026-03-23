"""Main application entry point for the FastAPI server."""

import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import database_user_router

# pylint: disable=unused-import
import app.db.listeners
from app import routers
from app.core import handlers
from app.auth import auth_config
from app.database import AsyncSessionLocal
from app.schemas import user_schemas
from app.utils import database_service


@asynccontextmanager
async def lifespan(fast_api_app: FastAPI):  # pylint: disable=unused-argument
    """Application lifespan context manager.

    Starts background tasks for fetching Prometheus metrics.
    :param app: FastAPI application instance
    :return: None
    """
    db = AsyncSessionLocal()
    try:
        await database_service.init_super_user(db)
        await database_service.init_virtual_lab(db)
        await database_service.init_document(db)
    finally:
        await db.close()
    status_task = asyncio.create_task(routers.prometheus_router.status_worker())
    metrics_task = asyncio.create_task(routers.prometheus_router.metrics_worker())
    try:
        yield
    finally:
        await db.close()
        status_task.cancel()
        metrics_task.cancel()
        await asyncio.gather(status_task, metrics_task, return_exceptions=True)


app = FastAPI(title="Labbyn API", lifespan=lifespan)
handlers.setup_exception_handlers(app)

# Mount static files for user avatars
if not os.path.exists(database_user_router.AVATAR_DIR):
    os.makedirs(database_user_router.AVATAR_DIR, exist_ok=True)
app.mount(
    "/static/avatars",
    StaticFiles(directory=routers.database_user_router.AVATAR_DIR),
    name="avatars",
)

# Configure CORS middleware temporarily for local development
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

# FastAPI Users routers
app.include_router(
    auth_config.fastapi_users.get_auth_router(auth_config.auth_backend),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    auth_config.fastapi_users.get_users_router(
        user_schemas.FastApiUserRead, user_schemas.FastApiUserUpdate
    ),
    prefix="/users",
    tags=["users"],
)

# Custom application routers
all_routers = [
    routers.auth,
    routers.user,
    routers.team,
    routers.room,
    routers.maps,
    routers.rack,
    routers.shelf,
    routers.machine,
    routers.cpus,
    routers.disks,
    routers.inventory,
    routers.category,
    routers.rental,
    routers.metadata,
    routers.tags,
    routers.documentation,
    routers.ansible,
    routers.prometheus,
    routers.dashboard,
    routers.history,
    routers.history_sub,
    routers.search,
]

for r in all_routers:
    app.include_router(r)
