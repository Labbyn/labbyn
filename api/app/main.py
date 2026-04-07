"""Main application entry point for the FastAPI server."""

import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import routers
from app.core import handlers
from app.auth import auth_config
from app.database import AsyncSessionLocal
from app.schemas import user_schemas
from app.utils import database_service
from app.routers.prometheus.executor import PrometheusExecutor


@asynccontextmanager
async def lifespan(fast_api_app: FastAPI):
    """Application lifespan context manager.

    Starts background tasks for fetching Prometheus metrics and initializes DB.
    """
    db = AsyncSessionLocal()
    try:
        await database_service.init_super_user(db)
        await database_service.init_virtual_lab(db)
        await database_service.init_document(db)
    finally:
        await db.close()

    status_task = asyncio.create_task(PrometheusExecutor.status_worker())
    metrics_task = asyncio.create_task(PrometheusExecutor.metrics_worker())

    try:
        yield
    finally:
        status_task.cancel()
        metrics_task.cancel()
        await asyncio.gather(status_task, metrics_task, return_exceptions=True)


app = FastAPI(title="Labbyn API", lifespan=lifespan)
handlers.setup_exception_handlers(app)

avatar_path = getattr(routers.user, "AVATAR_DIR", "static/avatars")
if not os.path.exists(avatar_path):
    os.makedirs(avatar_path, exist_ok=True)

app.mount(
    "/static/avatars",
    StaticFiles(directory=avatar_path),
    name="avatars",
)

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

all_app_routers = [
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
    routers.export_csv,
]

for r in all_app_routers:
    app.include_router(r)
