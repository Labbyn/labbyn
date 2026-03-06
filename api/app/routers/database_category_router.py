"""Router for Category Database API CRUD."""

from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_async_db
from app.db.models import Categories
from app.db.schemas import (
    CategoriesCreate,
    CategoriesResponse,
    CategoriesUpdate,
)
from app.utils.redis_service import acquire_lock
from app.auth.dependencies import RequestContext

router = APIRouter()


@router.post(
    "/db/categories/",
    response_model=CategoriesResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Categories"],
)
async def create_category(
    category_data: CategoriesCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Create new category (Async)
    :param category_data: Category data
    :param db: Async database session
    :return: Category object
    """
    ctx.require_admin()

    obj = Categories(**category_data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get(
    "/db/categories/", response_model=List[CategoriesResponse], tags=["Categories"]
)
async def get_categories(
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch all categories (Async)
    :param db: Async database session
    :param ctx: Request context for user and team info
    :return: List of all categories
    """
    ctx.require_user()

    result = await db.execute(select(Categories))
    return result.scalars().all()


@router.get(
    "/db/categories/{cat_id}", response_model=CategoriesResponse, tags=["Categories"]
)
async def get_category_by_id(
    cat_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch specific category by ID (Async)
    :param cat_id: Category ID
    :param db: Async database session
    :param ctx: Request context for user and team info
    :return: Category object
    """
    ctx.require_user()

    result = await db.execute(select(Categories).where(Categories.id == cat_id))
    cat = result.scalar_one_or_none()

    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    return cat


@router.patch(
    "/db/categories/{cat_id}", response_model=CategoriesResponse, tags=["Categories"]
)
async def update_category(
    cat_id: int,
    cat_data: CategoriesUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Update Category (Async)
    :param cat_id: Category ID
    :param cat_data: Category data schema
    :param db: Async database session
    :param ctx: Request context for user and team info
    :return: Updated Category
    """
    ctx.require_admin()

    async with acquire_lock(f"category_lock:{cat_id}"):
        result = await db.execute(select(Categories).where(Categories.id == cat_id))
        cat = result.scalar_one_or_none()

        if not cat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
            )

        for k, v in cat_data.model_dump(exclude_unset=True).items():
            setattr(cat, k, v)

        await db.commit()
        await db.refresh(cat)
        return cat


@router.delete(
    "/db/categories/{cat_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Categories"],
)
async def delete_category(
    cat_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Delete category (Async)
    :param cat_id: Category ID
    :param db: Async database session
    :param ctx: Request context for user and team info
    :return: None
    """
    ctx.require_admin()

    async with acquire_lock(f"category_lock:{cat_id}"):
        result = await db.execute(select(Categories).where(Categories.id == cat_id))
        cat = result.scalar_one_or_none()

        if not cat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
            )

        await db.delete(cat)
        await db.commit()
