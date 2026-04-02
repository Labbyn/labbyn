"""Dashboard dedicated endpoints router."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.database import get_async_db
from app.schemas import dashboard_schemas

from .service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "",
    response_model=dashboard_schemas.DashboardResponse,
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
    service = DashboardService(db, ctx)
    return await service.build_dashboard()
