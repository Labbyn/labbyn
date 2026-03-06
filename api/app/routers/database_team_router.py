"""Router for Team Database API CRUD."""

from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_async_db
from app.db.models import Teams, Inventory, Rack, Shelf, UsersTeams, Rooms, Machines
from app.db.schemas import (
    TeamsCreate,
    TeamsResponse,
    TeamsUpdate,
    TeamDetailResponse,
    TeamFullDetailResponse,
)
from app.utils.redis_service import acquire_lock
from app.auth.dependencies import RequestContext

router = APIRouter()


def format_team_output(team: Teams):
    """
    Format team output to include admin names and member details
    :param team: Team object to format
    :return: Formatted team dictionary with admin names and member details
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


def format_team_full_detail(team: Teams):
    """
    Format team output to include detailed information about admins, members, racks, machines, and inventory.
    :param team: team object to format
    :return: formatted team dictionary with detailed information about admins, members, racks, machines, and inventory
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
    "/db/teams/",
    response_model=TeamsResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Teams"],
)
async def create_team(
    team_data: TeamsCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Create new team
    :param team_data: Team data
    :param db: Active database session
    :return: Team object
    """
    ctx.require_admin()
    obj = Teams(**team_data.model_dump())
    db.add(obj)
    await db.flush()

    virtual_lab = Rooms(name="virtual", room_type="virtual", team_id=obj.id)
    db.add(virtual_lab)

    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/db/teams/", response_model=List[TeamsResponse], tags=["Teams"])
async def get_teams(
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch all teams
    :param db: Active database session
    :return: List of all teams
    """
    ctx.require_user()
    stmt = select(Teams)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get(
    "/db/teams/teams_info", response_model=List[TeamDetailResponse], tags=["Teams"]
)
async def get_team_info(
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch detailed information about the current user's team, including admin names and member details.
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Detailed team information with admin names and member details
    """
    ctx.require_user()
    stmt = select(Teams).options(joinedload(Teams.users).joinedload(UsersTeams.user))
    result = await db.execute(stmt)
    teams = result.unique().scalars().all()

    return [format_team_output(t) for t in teams]


@router.get(
    "/db/teams/team_info/{team_id}",
    response_model=TeamFullDetailResponse,
    tags=["Teams"],
)
async def get_team_info_by_id(
    team_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch detailed information about a specific team by ID, including user, machines, and inventory details.
    :param team_id: Team ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Detailed team information with admin names and member details
    """
    ctx.require_user()

    stmt = (
        select(Teams)
        .filter(Teams.id == team_id)
        .options(
            joinedload(Teams.users).joinedload(UsersTeams.user),
            joinedload(Teams.racks).joinedload(Rack.tags),
            joinedload(Teams.racks)
            .joinedload(Rack.shelves)
            .joinedload(Shelf.machines)
            .joinedload(Machines.tags),
            joinedload(Teams.machines).joinedload(Machines.tags),
            joinedload(Teams.inventory).joinedload(Inventory.room),
            joinedload(Teams.inventory).joinedload(Inventory.category),
            joinedload(Teams.inventory).joinedload(Inventory.machine),
        )
    )

    result = await db.execute(stmt)
    team = result.unique().scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    return format_team_full_detail(team)


@router.patch("/db/teams/{team_id}", response_model=TeamsResponse, tags=["Teams"])
async def update_team(
    team_id: int,
    team_data: TeamsUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Update Team
    :param team_id: Team ID
    :param team_data: Team data schema
    :param db: Active database session
    :return: Updated Team
    """

    if not ctx.is_admin:
        ctx.require_group_admin()
        stmt_check = select(UsersTeams).filter(
            UsersTeams.user_id == ctx.current_user.id,
            UsersTeams.team_id == team_id,
            UsersTeams.is_group_admin == True,
        )
        res_check = await db.execute(stmt_check)
        if not res_check.scalar_one_or_none():
            raise HTTPException(
                status_code=403, detail="You are not an admin of this team"
            )

    async with acquire_lock(f"team_lock:{team_id}"):
        stmt = select(Teams).filter(Teams.id == team_id)
        result = await db.execute(stmt)
        team = result.scalar_one_or_none()

        if not team:
            raise HTTPException(404, detail="Team not found")

        for k, v in team_data.model_dump(exclude_unset=True).items():
            setattr(team, k, v)

        await db.commit()
        await db.refresh(team)
        return team


@router.delete(
    "/db/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Teams"]
)
async def delete_team(
    team_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Delete Team
    :param team_id: Team ID
    :param db: Active database session
    :return: None
    """
    ctx.require_admin()
    async with acquire_lock(f"team_lock:{team_id}"):
        stmt = select(Teams).filter(Teams.id == team_id)
        result = await db.execute(stmt)
        team = result.scalar_one_or_none()

        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
            )

        await db.delete(team)
        await db.commit()
