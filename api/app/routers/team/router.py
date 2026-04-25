"""Router for Team Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, Response, status

from app.auth import dependencies
from app.schemas import team_schemas

from .service import TeamService

router = APIRouter(prefix="/db/teams", tags=["Teams"])


@router.post(
    "", response_model=team_schemas.TeamsResponse, status_code=status.HTTP_201_CREATED
)
async def create_team(
    team_data: team_schemas.TeamsCreate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create new team.

    :param team_data: Team data
    :param ctx: Request context for user and team info.

    :return: Team object.
    """
    return await TeamService(ctx.db, ctx).create_team(team_data)


@router.get("", response_model=List[team_schemas.TeamsResponse])
async def get_teams(
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all teams.
    :param ctx: Request context for user and team info.
    :return: List of all teams.
    """
    return await TeamService(ctx.db, ctx).repo.get_all(ctx.db)


@router.get("/teams_info", response_model=List[team_schemas.TeamDetailResponse])
async def get_teams_info(
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch detailed information about the current user's team.

    Including admin names and member details.

    :param ctx: Request context for user and team info
    :return: Detailed team information with admin names and member details.
    """
    service = TeamService(ctx.db, ctx)
    teams = await service.repo.get_all_detailed(ctx.db)
    return [service.format_team_output(t) for t in teams]


@router.get("/team_info/{team_id}", response_model=team_schemas.TeamFullDetailResponse)
async def get_team_info_by_id(
    team_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch detailed information about a specific team by ID.

    Including in team: users, machines, and inventory details.

    :param team_id: Team ID
    :param ctx: Request context for user and team info
    :return: Detailed team information with admin names and member details.
    """
    return await TeamService(ctx.db, ctx).get_detailed_team(team_id)


@router.patch("/{team_id}", response_model=team_schemas.TeamsResponse)
async def update_team(
    team_id: int,
    team_data: team_schemas.TeamsUpdate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update Team.

    :param team_id: Team ID
    :param team_data: Team data schema
    :param ctx: Request context for user and team info.
    :return: Updated Team.
    """
    return await TeamService(ctx.db, ctx).update_team(team_id, team_data)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete Team.

    :param team_id: Team ID
    :param db: Active database session
    :param ctx: Request context for user and team info.
    :return: None.
    """
    await TeamService(ctx.db, ctx).delete_team(team_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
