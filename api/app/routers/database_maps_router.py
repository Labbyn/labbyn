from fastapi import APIRouter, Depends
from sqlalchemy import select, delete
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession


from app.auth import dependencies
from app.core import exceptions
from app.database import get_async_db
from app.db import models
from app.schemas import map_schemas
from app.utils import redis_service

router = APIRouter(prefix="/rooms", tags=["Maps"])


@router.get("/{room_id}/map", response_model=map_schemas.MapResponse)
async def get_room_map(
    room_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific map by ID.

    :param room_id: room id
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Map object
    """
    ctx.require_user()

    stmt = (
        select(models.Map)
        .options(
            joinedload(models.Map.nodes),
            joinedload(models.Map.segments),
            joinedload(models.Map.equipment).joinedload(models.Equipment.rack),
            joinedload(models.Map.labels),
            joinedload(models.Map.room),
        )
        .filter(models.Map.room_id == room_id)
    )

    result = await db.execute(stmt)
    db_map = result.unique().scalar_one_or_none()

    if not db_map:
        raise exceptions.ObjectNotFoundError(f"Map for Room ID {room_id}")

    return db_map


@router.patch("/{room_id}/map", response_model=map_schemas.MapResponse)
async def sync_room_map(
    room_id: int,
    payload: map_schemas.MapUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update room map by ID.

    :param room_id: room id
    :param payload: Map update payload
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Map object
    """
    ctx.require_user()

    async with redis_service.acquire_lock(f"map_lock:{room_id}"):
        room = (
            await db.execute(select(models.Rooms).filter(models.Rooms.id == room_id))
        ).scalar_one_or_none()
        if not room:
            raise exceptions.ObjectNotFoundError(f"Room {room_id}")
        await ctx.validate_team_access(room.team_id)

        db_map = (
            await db.execute(select(models.Map).filter(models.Map.room_id == room_id))
        ).scalar_one_or_none()
        if not db_map:
            db_map = models.Map(room_id=room_id)
            db.add(db_map)
            await db.flush()

        try:
            await db.execute(
                delete(models.WallSegments).where(
                    models.WallSegments.map_id == db_map.id
                )
            )
            await db.execute(
                delete(models.WallNodes).where(models.WallNodes.map_id == db_map.id)
            )
            await db.execute(
                delete(models.Equipment).where(models.Equipment.map_id == db_map.id)
            )

            node_lookup = {}
            for n in payload.wall_nodes:
                new_node = models.WallNodes(name=n.name, x=n.x, y=n.y, map_id=db_map.id)
                db.add(new_node)
                node_lookup[n.name] = new_node

            await db.flush()

            for s in payload.wall_segments:
                n1 = node_lookup.get(s.node1_name)
                n2 = node_lookup.get(s.node2_name)
                if n1 and n2:
                    db.add(
                        models.WallSegments(
                            map_id=db_map.id,
                            name=s.name,
                            node1_id=n1.id,
                            node2_id=n2.id,
                            node1_name=s.node1_name,
                            node2_name=s.node2_name,
                        )
                    )
            for eq in payload.equipment:
                db.add(
                    models.Equipment(
                        name=eq.name,
                        eq_type=eq.eq_type,
                        x=eq.x,
                        y=eq.y,
                        rotation=eq.rotation,
                        label=eq.label,
                        map_id=db_map.id,
                        rack_id=eq.rack_id,
                    )
                )

            for lb in payload.labels:
                db.add(
                    models.MapLabels(
                        map_id=db_map.id, name=lb.name, x=lb.x, y=lb.y, color=lb.color
                    )
                )

            await db.commit()

            stmt = (
                select(models.Map)
                .options(
                    joinedload(models.Map.nodes),
                    joinedload(models.Map.segments),
                    joinedload(models.Map.equipment),
                    joinedload(models.Map.labels),
                )
                .filter(models.Map.id == db_map.id)
            )
            res = await db.execute(stmt)
            return res.unique().scalar_one()

        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                "Something went wrong, while updating map"
            ) from e
