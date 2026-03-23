"""Router for Documentation Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth import dependencies
from app.core import exceptions
from app.database import get_async_db
from app.db import models
from app.schemas import doc_schemas
from app.utils import redis_service

router = APIRouter(prefix="/db", tags=["Documentation"])


@router.get(
    "/documentation",
    response_model=List[doc_schemas.DocumentationResponse],
)
async def get_documentation(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get all documents from documentation.

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all documents.
    """
    ctx.require_user()
    stmt = select(models.Documentation).options(joinedload(models.Documentation.tags))
    result = await db.execute(stmt)
    return result.unique().scalars().all()


@router.post(
    "/documentation",
    response_model=doc_schemas.DocumentationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_documentation(
    documentation_data: doc_schemas.DocumentationCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create new document.

    :param documentation_data: Documentation data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: New document item.
    """
    ctx.require_user()
    current_author = ctx.current_user.login
    tag_ids = documentation_data.tag_ids or []

    try:
        obj = models.Documentation(
            **documentation_data.model_dump(exclude={"tag_ids"}), author=current_author
        )

        if tag_ids:
            tag_stmt = select(models.Tags).where(models.Tags.id.in_(tag_ids))
            tag_result = await db.execute(tag_stmt)
            obj.tags = list(tag_result.scalars().all())

        db.add(obj)
        await db.flush()
        await db.commit()

        stmt = (
            select(models.Documentation)
            .options(joinedload(models.Documentation.tags))
            .where(models.Documentation.id == obj.id)
        )
        result = await db.execute(stmt)
        return result.unique().scalar_one()

    except IntegrityError:
        await db.rollback()
        raise exceptions.ConflictError(
            message=f"Document with title '{documentation_data.title}' already exists."
        )
    except Exception as e:
        await db.rollback()
        if isinstance(e, exceptions.ConflictError):
            raise e
        raise exceptions.ValidationError(
            f"Could not create document: '{documentation_data.title}'"
        ) from e


@router.get(
    "/documentation/{documentation_id}",
    response_model=doc_schemas.DocumentationResponse,
)
async def get_documentation_by_id(
    documentation_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get specific document from documentation by ID.

    :param documentation_id: Document ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Document object.
    """
    ctx.require_user()
    stmt = (
        select(models.Documentation)
        .filter(models.Documentation.id == documentation_id)
        .options(joinedload(models.Documentation.tags))
    )
    result = await db.execute(stmt)
    document = result.unique().scalar_one_or_none()

    if not document:
        raise exceptions.ObjectNotFoundError("Document")
    return document


@router.patch(
    "/documentation/{documentation_id}",
    response_model=doc_schemas.DocumentationResponse,
)
async def update_documentation(
    documentation_id: int,
    documentation_data: doc_schemas.DocumentationUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update document data.

    :param documentation_id: Document ID
    :param documentation_data: Documentation data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated Document.
    """
    ctx.require_user()
    async with redis_service.acquire_lock(f"documentation_lock:{documentation_id}"):
        stmt = (
            select(models.Documentation)
            .filter(models.Documentation.id == documentation_id)
            .options(joinedload(models.Documentation.tags))
        )
        result = await db.execute(stmt)
        document = result.unique().scalar_one_or_none()

        if not document:
            raise models.ObjectNotFoundError("Document")

        old_title = document.title

        try:
            update_data = documentation_data.model_dump(exclude_unset=True)

            if "tag_ids" in update_data:
                tag_ids = update_data.pop("tag_ids")
                tag_stmt = select(models.Tags).where(models.Tags.id.in_(tag_ids))
                tag_result = await db.execute(tag_stmt)
                document.tags = list(tag_result.scalars().all())

            for k, v in update_data.items():
                if hasattr(document, k):
                    setattr(document, k, v)

            await db.flush()
            await db.commit()

            final_stmt = (
                select(models.Documentation)
                .options(joinedload(models.Documentation.tags))
                .where(models.Documentation.id == documentation_id)
            )
            refresh_res = await db.execute(final_stmt)
            return refresh_res.unique().scalar_one()

        except IntegrityError:
            await db.rollback()
            new_title = documentation_data.title or old_title
            raise exceptions.ConflictError(
                message=f"Update failed. Document title '{new_title}' is already taken."
            )
        except Exception as e:
            await db.rollback()
            if isinstance(e, exceptions.ConflictError):
                raise e
            raise exceptions.ValidationError(
                f"Failed to update document: '{old_title}'"
            ) from e


@router.delete(
    "/documentation/{documentation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_document(
    documentation_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete document.

    :param documentation_id: Document ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: 204 No Content as success
    """
    ctx.require_user()
    async with redis_service.acquire_lock(f"documentation_lock:{documentation_id}"):
        stmt = select(models.Documentation).filter(
            models.Documentation.id == documentation_id
        )
        result = await db.execute(stmt)
        document = result.scalar_one_or_none()

        if not document:
            raise exceptions.ObjectNotFoundError("Document")
        try:
            await db.delete(document)
            await db.commit()
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                f"Could not delete document: {document.title}"
            ) from e
