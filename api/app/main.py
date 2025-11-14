"""Main application entry point for the FastAPI server."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers import prometheus_router
from app.routers.prometheus_router import metrics_worker, status_worker


@asynccontextmanager
async def lifespan(fast_api_app: FastAPI): # pylint: disable=unused-argument
    """
    Application lifespan context manager.
    Starts background tasks for fetching Prometheus metrics.
    :param app: FastAPI application instance
    :return: None
    """
    status_task = asyncio.create_task(status_worker())
    metrics_task = asyncio.create_task(metrics_worker())
    try:
        yield
    finally:
        status_task.cancel()
        metrics_task.cancel()
        await asyncio.gather(status_task, metrics_task, return_exceptions=True)


app = FastAPI(lifespan=lifespan)
app.include_router(prometheus_router.router)
