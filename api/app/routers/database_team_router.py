"""Router for Team Database API CRUD."""
from typing import List
from app.database import get_db
from app.db.models import (
    Teams,
)
from app.db.schemas import (
    TeamsCreate,
    TeamsResponse,
    TeamsUpdate,
)
from app.utils.redis_service import acquire_lock
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()

@router.post(
    "/db/teams/",
    response_model=TeamsResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Teams"],
)
def create_team(team_data: TeamsCreate, db: Session = Depends(get_db)):
    """
    Create new team
    :param team_data: Team data
    :param db: Active database session
    :return: Team object
    """
    obj = Teams(**team_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/db/teams/", response_model=List[TeamsResponse], tags=["Teams"])
def get_teams(db: Session = Depends(get_db)):
    """
    Fetch all teams
    :param db: Active database session
    :return: List of all teams
    """
    return db.query(Teams).all()


@router.get("/db/teams/{team_id}", response_model=TeamsResponse, tags=["Teams"])
def get_team_by_id(team_id: int, db: Session = Depends(get_db)):
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
    team_id: int, team_data: TeamsUpdate, db: Session = Depends(get_db)
):
    """
    Update Team
    :param team_id: Team ID
    :param team_data: Team data schema
    :param db: Active database session
    :return: Updated Team
    """
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
async def delete_team(team_id: int, db: Session = Depends(get_db)):
    """
    Delete Team
    :param team_id: Team ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"team_lock:{team_id}"):
        team = db.query(Teams).filter(Teams.id == team_id).first()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
            )
        db.delete(team)
        db.commit()
