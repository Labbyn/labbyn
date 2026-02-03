"""Router for Team Database API CRUD."""

from typing import List
from app.database import get_db
from app.db.models import Layout, Layouts, Machines, Rooms
from app.db.schemas import (
    LayoutCreate,
    LayoutResponse,
    LayoutsCreate,
    LayoutsResponse,
    LayoutsUpdate,
    LayoutUpdate,
)
from app.utils.redis_service import acquire_lock
from app.auth.dependencies import RequestContext
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

router = APIRouter()


@router.post(
    "/db/layout/",
    response_model=LayoutResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Layout"],
)
def create_layout_coord(
    data: LayoutCreate, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Create layout coordinate
    :param data: Layout data
    :param db: Active database session
    :return: Layout object
    """
    obj = Layout(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/db/layout/", response_model=List[LayoutResponse], tags=["Layout"])
def get_all_layout_coords(
    db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch all layout coordinates
    :param db: Active database session
    :return: List of Layout
    """
    if ctx.is_admin:
        return db.query(Layout).all()
    query = db.query(Layout).outerjoin(Machines)
    query = query.filter(
        or_(
            Machines.team_id == ctx.team_id,
            Machines.team_id.is_(None),
        )
    )

    return query.distinct().all()


@router.get("/db/layout/{layout_id}", response_model=LayoutResponse, tags=["Layout"])
def get_layout_coord_by_id(
    layout_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch specific layout coordinate by ID
    :param layout_id: Layout ID
    :param db: Active database session
    :return: Layout object
    """
    query = db.query(Layout).filter(Layout.id == layout_id)
    if not ctx.is_admin:
        query = query.outerjoin(Machines).filter(
            or_(
                Machines.team_id == ctx.team_id,
                Machines.team_id.is_(None),
            )
        )

    obj = query.first()

    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Layout not found"
        )
    return obj


@router.put("/db/layout/{layout_id}", response_model=LayoutResponse, tags=["Layout"])
async def update_layout_coord(
    layout_id: int,
    data: LayoutUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Update layout coordinate
    :param layout_id: Layout ID
    :param data: Layout data
    :param db: Active database session
    :return: Updated Layout
    """
    async with acquire_lock(f"layout_lock:{layout_id}"):
        query = db.query(Layout).filter(Layout.id == layout_id)
        if not ctx.is_admin:
            query = query.outerjoin(Machines).filter(
                or_(
                    Machines.team_id == ctx.team_id,
                    Machines.team_id.is_(None),
                )
            )
        obj = query.first()
        if not obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Layout not found"
            )
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj


@router.delete(
    "/db/layout/{layout_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Layout"]
)
async def delete_layout_coord(
    layout_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Delete layout coordinate
    :param layout_id: Layout ID
    :param db: Active database session
    :return: None
    """
    ctx.require_group_admin()
    async with acquire_lock(f"layout_lock:{layout_id}"):
        obj = db.query(Layout).filter(Layout.id == layout_id).first()
        if not obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Layout not found or access denied",
            )
        db.delete(obj)
        db.commit()


@router.post(
    "/db/layouts/",
    response_model=LayoutsResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Layouts"],
)
def create_layout_assign(
    data: LayoutsCreate, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Create layout assignment
    :param data: Layouts data
    :param db: Active database session
    :return: Layouts assignment
    """
    room = db.query(Rooms).filter(Rooms.id == data.room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Room not found"
        )
    if not ctx.is_admin and room.team_id != ctx.team_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to the room"
        )
    obj = Layouts(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/db/layouts/", response_model=List[LayoutsResponse], tags=["Layouts"])
def get_all_layouts(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Fetch all layout assignments
    :param db: Active database session
    :return: List of Layouts
    """
    query = db.query(Layouts).join(Rooms)
    query = ctx.team_filter(query, Rooms)
    return query.all()


@router.get(
    "/db/layouts/{layouts_id}", response_model=LayoutsResponse, tags=["Layouts"]
)
def get_layouts_assign_by_id(
    layouts_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch specific layout assignment by ID
    :param layouts_id: Layouts ID
    :param db: Active database session
    :return: Layouts object
    """
    query = db.query(Layouts).join(Rooms).filter(Layouts.id == layouts_id)
    query = ctx.team_filter(query, Rooms)
    obj = query.first()
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Layouts assignment not found or access denied",
        )
    return obj


@router.put(
    "/db/layouts/{layouts_id}", response_model=LayoutsResponse, tags=["Layouts"]
)
async def update_layout_assign(
    layouts_id: int,
    data: LayoutsUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Update layout assignment
    :param layouts_id: Layouts ID
    :param data: Layouts data schema
    :param db: Active database session
    :return: Updated Layouts
    """
    async with acquire_lock(f"layouts_lock:{layouts_id}"):
        query = db.query(Layouts).join(Rooms).filter(Layouts.id == layouts_id)
        query = ctx.team_filter(query, Rooms)
        obj = query.first()
        if not obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Layouts assignment not found or access denied",
            )
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj


@router.delete(
    "/db/layouts/{layouts_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Layouts"]
)
async def delete_layout_assign(
    layouts_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Delete layout assignment
    :param layouts_id: Layouts ID
    :param db: Active database session
    :return: None
    """
    ctx.require_group_admin()

    async with acquire_lock(f"layouts_lock:{layouts_id}"):
        query = db.query(Layouts).join(Rooms).filter(Layouts.id == layouts_id)
        query_ctx = ctx.team_filter(query, Rooms)
        obj = query_ctx.first()
        if not obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Layouts assignment not found or access denied",
            )
        db.delete(obj)
        db.commit()
