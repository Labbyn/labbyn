"""Dashboard dedicated endpoints router."""

from fastapi import APIRouter, Depends

from app.auth import dependencies
from app.schemas import dashboard_schemas

from .service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "",
    response_model=dashboard_schemas.DashboardResponse,
)
async def get_dashboard(
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create dashboard view for user.

    :param ctx: Request context for user and team info
    :return: Dashboard view
    """
    service = DashboardService(ctx.db, ctx)
    return await service.build_dashboard()
