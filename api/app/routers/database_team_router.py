"""Router for Team Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import sql, orm
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.database import get_async_db
from app.db import models
from app.schemas import team_schemas
from app.utils import redis_service

router = APIRouter(prefix="/db", tags=["Teams"])


def format_team_output(team: models.Teams):
    """Format team output to include admin names and member details.

    :param team: Team object to format
    :return: Formatted team dictionary with admin names and member details.
    """
    group_admins = [m.user for m in team.users if m.is_group_admin]
    admins_info = [
        {
            "id": a.id,
            "full_name": f"{a.name} {a.surname}",
            "login": a.login,
            "user_type": str(a.user_type),
            "email": a.email,
            "is_group_admin": True,
            "user_link": f"/users/{a.id}",
        }
        for a in group_admins
    ]

    return {
        "id": team.id,
        "name": team.name,
        "admins": admins_info,
        "member_count": len(team.users),
        "members": [
            {
                "id": m.user.id,
                "full_name": f"{m.user.name} {m.user.surname}",
                "login": m.user.login,
                "user_type": str(m.user.user_type),
                "email": m.user.email,
                "is_group_admin": m.is_group_admin,
                "user_link": f"/users/{m.user.id}",
            }
            for m in team.users
        ],
    }


def format_team_full_detail(team: models.Teams):
    """Format team output to include detailed information.

    Includes entries about admins, members, racks, machines, and inventory.

    :param team: team object to format
    :return: formatted team dictionary with detailed information
    """
    group_admins = [m.user for m in team.users if m.is_group_admin]

    admins_info = [
        {
            "full_name": f"{a.name} {a.surname}",
            "login": a.login,
            "email": a.email,
        }
        for a in group_admins
    ]

    sorted_machines = []
    for rack in team.racks:
        for shelf in sorted(rack.shelves, key=lambda s: s.order or 0):
            for machine in shelf.machines:
                sorted_machines.append(
                    {
                        "id": machine.id,
                        "name": machine.name,
                        "ip_address": machine.ip_address,
                        "mac_address": machine.mac_address,
                        "team_name": team.name,
                        "rack_name": rack.name,
                        "shelf_order": shelf.order,
                        "tags": [
                            {
                                "name": getattr(t, "name", "Unnamed"),
                                "color": getattr(t, "color", "red"),
                            }
                            for t in (machine.tags or [])
                        ],
                    }
                )

    placed_machine_names = {m["name"] for m in sorted_machines}
    for machine in team.machines:
        if machine.name not in placed_machine_names:
            sorted_machines.append(
                {
                    "id": machine.id,
                    "name": machine.name,
                    "ip_address": machine.ip_address,
                    "mac_address": machine.mac_address,
                    "team_name": team.name,
                    "rack_name": "Unplaced",
                    "shelf_order": 0,
                    "tags": [
                        {"name": t.name, "color": t.color} for t in (machine.tags or [])
                    ],
                }
            )

    return {
        "id": team.id,
        "name": team.name,
        "admins": admins_info,
        "members": [
            {
                "id": m.user.id,
                "full_name": f"{m.user.name} {m.user.surname}",
                "login": m.user.login,
                "email": m.user.email,
                "user_type": str(m.user.user_type),
                "is_group_admin": m.is_group_admin,
                "user_link": f"/users/{m.user.id}",
            }
            for m in team.users
        ],
        "racks": [
            {
                "id": r.id,
                "name": r.name,
                "team_name": team.name,
                "map_link": f"/map/room/{r.room_id}",
                "tags": [
                    {
                        "name": getattr(t, "name", "Unnamed"),
                        "color": getattr(t, "color", "red"),
                    }
                    for t in (r.tags or [])
                ],
                "machines_count": sum(len(shelf.machines) for shelf in r.shelves),
            }
            for r in team.racks
        ],
        "machines": sorted_machines,
        "inventory": [
            {
                "id": i.id,
                "name": i.name,
                "quantity": i.quantity,
                "team_name": team.name,
                "room_name": i.room.name if i.room else "Unknown",
                "machine_info": i.machine.name if i.machine else "N/A",
                "category_name": i.category.name if i.category else "General",
                "rental_status": i.rental_status,
                "rental_id": i.rental_id,
                "location_link": f"/rooms/{i.localization_id}",
            }
            for i in team.inventory
        ],
    }


@router.post(
    "/teams",
    response_model=team_schemas.TeamsResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_team(
    team_data: team_schemas.TeamsCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create new team.

    :param team_data: Team data
    :param db: Active database session
    :return: Team object.
    """
    ctx.require_admin()
    try:
        obj = models.Teams(**team_data.model_dump())
        db.add(obj)
        await db.flush()

        virtual_lab = models.Rooms(name="virtual", room_type="virtual", team_id=obj.id)
        db.add(virtual_lab)

        await db.commit()
        await db.refresh(obj)
        return obj
    except Exception as e:
        await db.rollback()
        raise exceptions.ValidationError(
            f"Failed to create team '{team_data.name}'"
        ) from e


@router.get("/teams", response_model=List[team_schemas.TeamsResponse])
async def get_teams(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all teams.

    :param db: Active database session
    :return: List of all teams.
    """
    ctx.require_user()
    stmt = sql.select(models.Teams)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/teams/teams_info", response_model=List[team_schemas.TeamDetailResponse])
async def get_team_info(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch detailed information about the current user's team.

    Including admin names and member details.

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Detailed team information with admin names and member details.
    """
    ctx.require_user()
    stmt = sql.select(models.Teams).options(
        orm.joinedload(models.Teams.users).joinedload(models.UsersTeams.user)
    )
    result = await db.execute(stmt)
    teams = result.unique().scalars().all()

    return [format_team_output(t) for t in teams]


@router.get(
    "/teams/team_info/{team_id}",
    response_model=team_schemas.TeamFullDetailResponse,
)
async def get_team_info_by_id(
    team_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch detailed information about a specific team by ID.

    Including in team: users, machines, and inventory details.

    :param team_id: Team ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Detailed team information with admin names and member details.
    """
    ctx.require_user()

    stmt = (
        sql.select(models.Teams)
        .filter(models.Teams.id == team_id)
        .options(
            orm.joinedload(models.Teams.users).joinedload(models.UsersTeams.user),
            orm.joinedload(models.Teams.racks).joinedload(models.Rack.tags),
            orm.joinedload(models.Teams.racks)
            .joinedload(models.Rack.shelves)
            .joinedload(models.Shelf.machines)
            .joinedload(models.Machines.tags),
            orm.joinedload(models.Teams.machines).joinedload(models.Machines.tags),
            orm.joinedload(models.Teams.inventory).joinedload(models.Inventory.room),
            orm.joinedload(models.Teams.inventory).joinedload(
                models.Inventory.category
            ),
            orm.joinedload(models.Teams.inventory).joinedload(models.Inventory.machine),
        )
    )

    result = await db.execute(stmt)
    team = result.unique().scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    return format_team_full_detail(team)


@router.patch("/teams/{team_id}", response_model=team_schemas.TeamsResponse)
async def update_team(
    team_id: int,
    team_data: team_schemas.TeamsUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update Team.

    :param team_id: Team ID
    :param team_data: Team data schema
    :param db: Active database session
    :return: Updated Team.
    """
    ctx.require_user()

    async with redis_service.acquire_lock(f"team_lock:{team_id}"):
        stmt = sql.select(models.Teams).filter(models.Teams.id == team_id)
        team = (await db.execute(stmt)).scalar_one_or_none()

        if not team:
            raise exceptions.ObjectNotFoundError("Team", str(team_id))

        team_name = team.name

        if not ctx.is_admin:
            ctx.require_group_admin()
            stmt_check = sql.select(models.UsersTeams).filter(
                models.UsersTeams.user_id == ctx.current_user.id,
                models.UsersTeams.team_id == team_id,
                models.UsersTeams.is_group_admin.is_(True),
            )
            if not (await db.execute(stmt_check)).scalar_one_or_none():
                raise exceptions.AccessDeniedError(
                    f"You are not an admin of team '{team_name}'"
                )

        try:
            for k, v in team_data.model_dump(exclude_unset=True).items():
                setattr(team, k, v)

            await db.commit()
            await db.refresh(team)
            return team
        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                f"Failed to update team '{team_name}'"
            ) from e


@router.delete("/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete Team.

    :param team_id: Team ID
    :param db: Active database session
    :return: None.
    """
    ctx.require_admin()
    async with redis_service.acquire_lock(f"team_lock:{team_id}"):
        stmt = sql.select(models.Teams).filter(models.Teams.id == team_id)
        result = await db.execute(stmt)
        team = result.scalar_one_or_none()

        if not team:
            raise exceptions.ObjectNotFoundError("Team")

        try:
            await db.delete(team)
            await db.commit()
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                f"Could not delete team '{team.name}'"
            ) from e
