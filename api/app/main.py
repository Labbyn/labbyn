"""Main application entry point for the FastAPI server."""

import asyncio
from contextlib import asynccontextmanager

import fastapi_users
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    prometheus_router,
    database_category_router,
    database_inventory_router,
    database_layouts_router,
    database_machine_router,
    database_metadata_router,
    database_rental_router,
    database_room_router,
    database_team_router,
    database_user_router,
    database_history_router,
    ansible_router,
)
from app.routers.prometheus_router import metrics_worker, status_worker
from app.database import SessionLocal
from app.utils.database_service import init_super_user

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
