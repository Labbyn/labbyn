from fastapi import (
    APIRouter,
    Depends,
    Query,
    Response,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from app.database import get_async_db
from app.auth import dependencies, manager, auth_config
from .service import PrometheusService
from app.schemas import service_schemas
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["Prometheus"])


@router.websocket("/ws/metrics")
async def websocket_endpoint(
    ws: WebSocket,
    instance: str = Query(None, description="Filter by instance"),
    db: AsyncSession = Depends(get_async_db),
    user_manager=Depends(manager.get_user_manager),
    strategy=Depends(auth_config.get_database_strategy),
):
    """WebSocket endpoint to push metrics data to front-end.

    Websocket will send cached metrics data at regular intervals,
    to reduce load on API server and Prometheus.
    :param ws: WebSocket connection
    :param instance: Filter by instance
    :param db: Database connection
    :param user_manager: User manager
    :param strategy: Strategy object
    :return: Fetch ws data
    """
    await ws.accept()
    token = ws.query_params.get("token")
    if not token:
        await ws.send_json({"Authentication token is required."})
        return await ws.close(code=status.WS_1008_POLICY_VIOLATION)

    user = await strategy.read_token(token, user_manager)
    ctx = await dependencies.RequestContext.for_websocket(user, db)

    try:
        await PrometheusService(db, ctx).stream_metrics(ws, instance)
    except WebSocketDisconnect:
        pass


@router.post("/prometheus/target")
async def add_target(
    target: service_schemas.PrometheusTarget,
    db: AsyncSession = Depends(get_async_db),
    ctx=Depends(dependencies.RequestContext.create),
):
    """Add a new target to Prometheus targets file.

    :param target: PrometheusTarget object containing instance and labels
    :param ctx: Request context for user and team info
    :param db: Active database session
    :return: Success message.
    """
    return await PrometheusService(db, ctx).add_target(target)


@router.delete("/prometheus/target")
async def delete_target(
    target: service_schemas.PrometheusBase,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Add a new target to Prometheus targets file.

    :param target: Prometheus instance object containing instance and labels
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success message.
    """
    await PrometheusService(db, ctx).remove_target(target.instance)
    return Response(status_code=204)
