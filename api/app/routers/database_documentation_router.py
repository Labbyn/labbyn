"""Router for Documentation Database API CRUD."""

from typing import List

from app.database import get_async_db
from app.db.models import Documentation, Tags
from app.db.schemas import (
    DocumentationCreate,
    DocumentationUpdate,
    DocumentationResponse,
)
from app.utils.redis_service import acquire_lock
from app.auth.dependencies import RequestContext
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

router = APIRouter()


@router.get(
    "/db/documentation/",
    response_model=List[DocumentationResponse],
    tags=["Documentation"],
)
async def get_documentation(
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Get all documents from documentation
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all documents
    """
    ctx.require_user()
    stmt = select(Documentation).options(joinedload(Documentation.tags))
    result = await db.execute(stmt)
    return result.unique().scalars().all()


@router.post(
    "/db/documentation/",
    response_model=DocumentationResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Documentation"],
)
async def create_documentation(
    documentation_data: DocumentationCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Create new document
    :param data: Documentation data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: New document item
    """
    ctx.require_user()
    current_author = ctx.current_user.login
    tag_ids = documentation_data.tag_ids or []

    obj = Documentation(
        **documentation_data.model_dump(exclude={"tag_ids"}), author=current_author
    )

    if tag_ids:
        tag_stmt = select(Tags).where(Tags.id.in_(tag_ids))
        tag_result = await db.execute(tag_stmt)
        obj.tags = tag_result.scalars().all()

    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    await db.refresh(obj, attribute_names=["tags"])
    return obj


@router.get(
    "/db/documentation/{documentation_id}",
    response_model=DocumentationResponse,
    tags=["Documentation"],
)
async def get_documentation_by_id(
    documentation_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Get specific document from documentation by ID
    :param documentation_id: Document ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Document object
    """
    ctx.require_user()
    stmt = (
        select(Documentation)
        .filter(Documentation.id == documentation_id)
        .options(joinedload(Documentation.tags))
    )
    result = await db.execute(stmt)
    document = result.unique().scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )
    return document


@router.patch(
    "/db/documentation/{documentation_id}",
    response_model=DocumentationResponse,
    tags=["Documentation"],
)
async def update_documentation(
    documentation_id: int,
    documentation_data: DocumentationUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Update document data
    :param documentation_id: Document ID
    :param documentation_data: Documentation data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated Document
    """
    ctx.require_user()
    async with acquire_lock(f"documentation_lock:{documentation_id}"):
        stmt = (
            select(Documentation)
            .filter(Documentation.id == documentation_id)
            .options(joinedload(Documentation.tags))
        )
        result = await db.execute(stmt)
        document = result.unique().scalar_one_or_none()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
            )

        update_data = documentation_data.model_dump(exclude_unset=True)
        if "tag_ids" in update_data:
            tag_ids = update_data.pop("tag_ids")
            tag_stmt = select(Tags).where(Tags.id.in_(tag_ids))
            tag_result = await db.execute(tag_stmt)
            document.tags = tag_result.scalars().all()

        for k, v in update_data.items():
            setattr(document, k, v)

        await db.commit()
        await db.refresh(document)
        await db.refresh(document, attribute_names=["tags"])
        return document


@router.delete(
    "/db/documentation/{documentation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Documentation"],
)
async def delete_document(
    documentation_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Delete document
    :param documentation_id: Document ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None
    """
    ctx.require_user()
    async with acquire_lock(f"documentation_lock:{documentation_id}"):
        stmt = select(Documentation).filter(Documentation.id == documentation_id)
        result = await db.execute(stmt)
        document = result.scalar_one_or_none()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
            )

        await db.delete(document)
        await db.commit()
