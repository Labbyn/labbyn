"""Router for Category Database API CRUD."""

from typing import List
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import dependencies
from app.database import get_async_db
from app.schemas import category_schemas
from .service import CategoryService

router = APIRouter(prefix="/db/categories", tags=["Categories"])


@router.post(
    "",
    response_model=category_schemas.CategoriesResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
    category_data: category_schemas.CategoriesCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all categories.

    :param db: Async database session
    :param ctx: Request context for user and team info
    :return: List of all categories.
    """
    service = CategoryService(db, ctx)
    return await service.create_category(category_data)


@router.get("", response_model=List[category_schemas.CategoriesResponse])
async def get_categories(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all categories.

    :param db: Async database session
    :param ctx: Request context for user and team info
    :return: List of all categories.
    """
    return await CategoryService(db, ctx).get_categories()


@router.get("/{cat_id}", response_model=category_schemas.CategoriesResponse)
async def get_category_by_id(
    cat_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific category by ID.

    :param cat_id: Category ID
    :param db: Async database session
    :param ctx: Request context for user and team info
    :return: Category object.
    """
    service = CategoryService(db, ctx)
    cat = await service.get_category_or_404(cat_id)
    return cat


@router.patch("/{cat_id}", response_model=category_schemas.CategoriesResponse)
async def update_category(
    cat_id: int,
    cat_data: category_schemas.CategoriesUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update Category.

    :param cat_id: Category ID
    :param cat_data: Category data schema
    :param db: Async database session
    :param ctx: Request context for user and team info
    :return: Updated Category.
    """
    return await CategoryService(db, ctx).update_category(cat_id, cat_data)


@router.delete("/{cat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    cat_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete category.

    :param cat_id: Category ID
    :param db: Async database session
    :param ctx: Request context for user and team info
    :return: 204 No Content as success
    """
    await CategoryService(db, ctx).delete_category(cat_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
