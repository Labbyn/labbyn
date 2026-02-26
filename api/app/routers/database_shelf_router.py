"""Router for Shelf Database API CRUD."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.db.models import Rack, Shelf
from app.auth.dependencies import RequestContext
from app.db.schemas import (
    ShelfCreate,
    ShelfUpdate,
    ShelfResponse,
)

router = APIRouter(tags=["shelves"])


@router.get("/db/rack/{rack_id}/all", response_model=List[ShelfResponse])
def get_shelves_by_rack(
    rack_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Get all shelves for a specific rack
    :param rack_id: ID of the rack
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of shelves belonging to the rack
    """
    ctx.require_user()

    rack_query = db.query(Rack).filter(Rack.id == rack_id).first()
    rack = ctx.team_filter(rack_query, Rack).first()
    if not rack:
        raise HTTPException(status_code=404, detail="Rack does not exist.")

    return (
        db.query(Shelf)
        .filter(Shelf.rack_id == rack_id)
        .order_by(Shelf.order.desc())
        .all()
    )


@router.get("/db/shelf/{shelf_id}", response_model=ShelfResponse)
def get_single_shelf(
    shelf_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch specific shelf by ID with its nested machines
    :param shelf_id: ID of the shelf
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Detailed shelf object
    """
    ctx.require_user()

    shelf = (
        db.query(Shelf)
        .options(joinedload(Shelf.machines))
        .filter(Shelf.id == shelf_id)
        .first()
    )
    rack_query = db.query(Rack).filter(Rack.id == shelf.rack_id)
    if not ctx.team_filter(rack_query, Rack).first():
        raise HTTPException(
            status_code=403, detail="You do not have permission to view this shelf."
        )
    if not shelf:
        raise HTTPException(status_code=404, detail="Shelf does not exist.")

    return shelf


@router.post(
    "/db/shelf/{rack_id}",
    response_model=ShelfResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_shelf(
    rack_id: int,
    shelf_data: ShelfCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Create a new shelf in a specific rack
    :param rack_id: ID of the parent rack
    :param shelf_data: Data for the new shelf
    :param db: Active database session
    :param ctx: Request context for authorization
    :return: Created shelf object with rack context
    """
    ctx.require_user()
    rack_query = db.query(Rack).filter(Rack.id == rack_id)
    rack = ctx.team_filter(rack_query, Rack).first()
    if not rack:
        raise HTTPException(
            status_code=404, detail="Rack does not exist or access denied."
        )

    db_shelf = Shelf(**shelf_data.model_dump(), rack_id=rack_id)
    db.add(db_shelf)
    db.commit()
    db.refresh(db_shelf)

    db_shelf.rack_name = rack.name

    return db_shelf


@router.patch("/db/shelf/{shelf_id}", response_model=ShelfResponse)
def update_shelf(
    shelf_id: int,
    shelf_data: ShelfUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Update shelf details like name or order
    :param shelf_id: ID of the shelf to update
    :param shelf_data: Fields to update
    :param db: Active database session
    :param ctx: Request context for permissions
    :return: Updated shelf object
    """
    ctx.require_user()

    db_shelf = db.query(Shelf).filter(Shelf.id == shelf_id).first()
    if not db_shelf:
        raise HTTPException(status_code=404, detail="Shelf does not exist.")

    rack_query = db.query(Rack).filter(Rack.id == db_shelf.rack_id)
    if not ctx.team_filter(rack_query, Rack).first():
        raise HTTPException(
            status_code=403, detail="You do not have permission to manage this shelf."
        )

    update_dict = shelf_data.model_dump(exclude_unset=True)

    for key, value in update_dict.items():
        setattr(db_shelf, key, value)

    db.commit()
    db.refresh(db_shelf)
    return db_shelf


@router.delete("/db/shelf/{shelf_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shelf(
    shelf_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Delete a specific shelf if it is empty
    :param shelf_id: ID of the shelf to delete
    :param db: Active database session
    :param ctx: Request context for authorization
    :return: No content response
    """

    ctx.require_user()

    db_shelf = db.query(Shelf).filter(Shelf.id == shelf_id).first()
    if not db_shelf:
        raise HTTPException(status_code=404, detail="Shelf does not exist.")

    rack_query = db.query(Rack).filter(Rack.id == db_shelf.rack_id)
    if not ctx.team_filter(rack_query, Rack).first():
        raise HTTPException(
            status_code=403, detail="You do not have permission to manage this shelf."
        )

    if db_shelf.machines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shelf is not empty. Please remove all machines from the shelf before deleting it.",
        )

    db.delete(db_shelf)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
