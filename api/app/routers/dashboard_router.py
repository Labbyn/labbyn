"""Dashboard dedidacted endpoints router."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.database import get_async_db
from app.schemas import dashboard_schemas
from app.utils import dashboard_service

router = APIRouter(tags=["Dashboard"])


@router.get(
    "/dashboard",
    response_model=dashboard_schemas.DashboardResponse,
    tags=["Dashboard"],
)
async def get_dashboard(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create dashboard view for user.

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Dashboard view
    """
    return await dashboard_service.build_dashboard(db, ctx)
