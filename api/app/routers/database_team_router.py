"""Router for Team Database API CRUD."""

from typing import List
from app.database import get_db
from app.db.models import (
    Teams,
)
from app.db.schemas import TeamsCreate, TeamsResponse, TeamsUpdate, TeamDetailResponse
from app.utils.redis_service import acquire_lock
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.auth.dependencies import RequestContext

from app.db.models import UserType

router = APIRouter()


def format_team_output(team: Teams):
    """
    Format team output to include admin names and member details
    :param team: Team object to format
    :return: Formatted team dictionary with admin names and member details
    """
    team_admin = next((u for u in team.users if u.id == team.team_admin_id), None)

    if team_admin:
        admin_display = f"{team_admin.name} {team_admin.surname}"
    else:
        admin_display = "No admin assigned"

    return {
        "id": team.id,
        "name": team.name,
        "team_admin_name": admin_display,
        "members": [
            {
                "id": u.id,
                "full_name": f"{u.name} {u.surname}",
                "email": u.email,
                "user_link": f"/users/{u.id}",
            }
            for u in team.users
        ],
    }


@router.post(
    "/db/teams/",
    response_model=TeamsResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Teams"],
)
def create_team(
    team_data: TeamsCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
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
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/db/teams/", response_model=List[TeamsResponse], tags=["Teams"])
def get_teams(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Fetch all teams
    :param db: Active database session
    :return: List of all teams
    """
    return db.query(Teams).all()


@router.get(
    "/db/teams/team_info", response_model=List[TeamDetailResponse], tags=["Teams"]
)
def get_team_info(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Fetch detailed information about the current user's team, including admin names and member details.
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Detailed team information with admin names and member details
    """
    ctx.require_user()
    teams = db.query(Teams).options(joinedload(Teams.users)).all()
    return [format_team_output(t) for t in teams]


@router.get(
    "/db/teams/team_info/{team_id}", response_model=TeamDetailResponse, tags=["Teams"]
)
def get_team_info_by_id(
    team_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch detailed information about a specific team by ID, including admin names and member details.
    :param team_id: Team ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Detailed team information with admin names and member details
    """
    ctx.require_user()

    team = (
        db.query(Teams)
        .filter(Teams.id == team_id)
        .options(joinedload(Teams.users))
        .first()
    )

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    return format_team_output(team)


@router.get("/db/teams/{team_id}", response_model=TeamsResponse, tags=["Teams"])
def get_team_by_id(
    team_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch specific team by ID
    :param team_id: Team ID
    :param db: Active database session
    :return: Team object
    """
    team = db.query(Teams).filter(Teams.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )
    return team


@router.put("/db/teams/{team_id}", response_model=TeamsResponse, tags=["Teams"])
async def update_team(
    team_id: int,
    team_data: TeamsUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
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
        if team_id != ctx.team_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update this team",
            )

    async with acquire_lock(f"team_lock:{team_id}"):
        team = db.query(Teams).filter(Teams.id == team_id).first()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
            )
        for k, v in team_data.model_dump(exclude_unset=True).items():
            setattr(team, k, v)
        db.commit()
        db.refresh(team)
        return team


@router.delete(
    "/db/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Teams"]
)
async def delete_team(
    team_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Delete Team
    :param team_id: Team ID
    :param db: Active database session
    :return: None
    """
    ctx.require_admin()
    async with acquire_lock(f"team_lock:{team_id}"):
        team = db.query(Teams).filter(Teams.id == team_id).first()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
            )
        db.delete(team)
        db.commit()
