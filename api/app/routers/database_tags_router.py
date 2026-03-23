"""Router for Tags Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import sql
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.database import get_async_db
from app.db import models
from app.schemas import tag_schemas
from app.utils import redis_service

router = APIRouter(prefix="/db", tags=["Tags"])


ENTITY_MAP = {
    "machine": models.Machines,
    "rack": models.Rack,
    "room": models.Rooms,
    "documentation": models.Documentation,
}


@router.get(
    "/tags",
    response_model=List[tag_schemas.TagsResponse],
)
async def get_tags(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get all tags.

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all tags.
    """
    ctx.require_user()
    stmt = sql.select(models.Tags)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/tags/assign", status_code=status.HTTP_200_OK)
async def assign_tag(
    data: tag_schemas.TagsAssignment,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Assign tag to object.

    Can be used for machine, rack, room and documentation objects

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all tags.
    """
    ctx.require_user()

    model = ENTITY_MAP.get(data.entity_type.lower())
    if not model:
        raise exceptions.ValidationError(f"Invalid entity type: {data.entity_type}")

    async with redis_service.acquire_lock(
        f"tag_assign_{data.entity_type}:{data.entity_id}"
    ):
        stmt = sql.select(model).filter(model.id == data.entity_id)
        if data.entity_type.lower() != "documentation":
            stmt = ctx.team_filter(stmt, model)

        result = await db.execute(stmt)
        entity = result.scalar_one_or_none()

        if not entity:
            raise exceptions.ObjectNotFoundError(data.entity_type.capitalize())

        tag_stmt = sql.select(models.Tags).where(models.Tags.id.in_(data.tag_ids))
        tag_res = await db.execute(tag_stmt)
        tags_to_add = tag_res.scalars().all()

        if not tags_to_add:
            raise exceptions.ObjectNotFoundError("Tag")

        await db.refresh(entity, ["tags"])
        entity_name = getattr(entity, "name", str(entity.id))
        new_tags_names = []

        changed = False
        for tag in tags_to_add:
            if tag not in entity.tags:
                entity.tags.append(tag)
                new_tags_names.append(tag.name)
                changed = True

        if changed:
            await db.commit()
            return {
                "message": f"Assigned tags [{', '.join(new_tags_names)}] "
                f"to {data.entity_type} '{entity_name}'"
            }

        return {"message": f"Tags already assigned to '{entity_name}'"}


@router.post("/tags/detach", status_code=status.HTTP_200_OK)
async def detach_tag(
    data: tag_schemas.TagsAssignment,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Detach tag from object.

    Can be used for machine, rack, room and documentation objects

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all tags.
    """
    ctx.require_user()

    model = ENTITY_MAP.get(data.entity_type.lower())
    if not model:
        raise exceptions.ValidationError(f"Invalid entity type: {data.entity_type}")

    async with redis_service.acquire_lock(
        f"tag_assign_{data.entity_type}:{data.entity_id}"
    ):
        stmt = sql.select(model).filter(model.id == data.entity_id)
        if data.entity_type.lower() != "documentation":
            stmt = ctx.team_filter(stmt, model)

        entity = (await db.execute(stmt)).scalar_one_or_none()

        if not entity:
            raise exceptions.ObjectNotFoundError(data.entity_type.capitalize())

        if not data.tag_ids:
            raise exceptions.ValidationError("No tag IDs provided for detachment")

        target_tag_id = data.tag_ids[0]
        tag_stmt = sql.select(models.Tags).filter(models.Tags.id == target_tag_id)
        tag = (await db.execute(tag_stmt)).scalar_one_or_none()

        if not tag:
            raise exceptions.ObjectNotFoundError("Tag")

        await db.refresh(entity, ["tags"])
        entity_name = getattr(entity, "name", str(entity.id))

        if tag in entity.tags:
            entity.tags.remove(tag)
            await db.commit()
            return {
                "message": f"Tag '{tag.name}' detached from "
                f"{data.entity_type} '{entity_name}'"
            }

        return {"message": f"Tag '{tag.name}' was not assigned to '{entity_name}'"}


@router.post(
    "/tags",
    response_model=tag_schemas.TagsResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_tag(
    tag_data: tag_schemas.TagsCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create new tag.

    :param tag_data: Tag data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: New tag item.
    """
    ctx.require_group_admin()

    obj = models.Tags(**tag_data.model_dump())
    try:
        db.add(obj)
        await db.flush()
        await db.commit()

        res = await db.execute(sql.select(models.Tags).where(models.Tags.id == obj.id))
        return res.scalar_one()
    except IntegrityError:
        await db.rollback()
        raise exceptions.ConflictError(
            message=f"Tag with name '{tag_data.name}' already exists."
        )
    except Exception as e:
        await db.rollback()
        if isinstance(e, exceptions.ConflictError):
            raise e
        raise exceptions.ValidationError(
            f"Failed to create tag '{tag_data.name}'"
        ) from e


@router.get(
    "/tags/{tag_id}",
    response_model=tag_schemas.TagsResponse,
)
async def get_tag_by_id(
    tag_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get specific tag by ID.

    :param tag_id: Tag ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Tag object.
    """
    ctx.require_user()
    stmt = sql.select(models.Tags).filter(models.Tags.id == tag_id)
    result = await db.execute(stmt)
    tag = result.scalar_one_or_none()

    if not tag:
        raise exceptions.ObjectNotFoundError("Tag")

    return tag


@router.patch(
    "/tags/{tag_id}",
    response_model=tag_schemas.TagsResponse,
)
async def update_tag(
    tag_id: int,
    tag_data: tag_schemas.TagsUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update tag data.

    :param tag_id: Tag ID
    :param tag_data: Tag data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated tag.
    """
    ctx.require_group_admin()
    async with redis_service.acquire_lock(f"tag_lock:{tag_id}"):
        stmt = sql.select(models.Tags).filter(models.Tags.id == tag_id)
        result = await db.execute(stmt)
        tag = result.scalar_one_or_none()

        if not tag:
            raise exceptions.ObjectNotFoundError("Tag")

        old_name = tag.name

        try:
            update_data = tag_data.model_dump(exclude_unset=True)
            for k, v in update_data.items():
                if hasattr(tag, k):
                    setattr(tag, k, v)

            await db.flush()
            await db.commit()

            res = await db.execute(
                sql.select(models.Tags).where(models.Tags.id == tag_id)
            )
            return res.scalar_one()

        except IntegrityError:
            await db.rollback()
            new_name = update_data.get("name") or old_name
            raise exceptions.ConflictError(
                message=f"Update failed. Tag name '{new_name}' is already taken."
            )
        except Exception as e:
            await db.rollback()
            if isinstance(e, exceptions.ConflictError):
                raise e
            raise exceptions.ValidationError(
                f"Failed to update tag '{old_name}'"
            ) from e


@router.delete(
    "/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete tag.

    :param tag_id: Tag ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None.
    """
    ctx.require_group_admin()
    async with redis_service.acquire_lock(f"tag_lock:{tag_id}"):
        stmt = sql.select(models.Tags).filter(models.Tags.id == tag_id)
        result = await db.execute(stmt)
        tag = result.scalar_one_or_none()

        if not tag:
            raise exceptions.ObjectNotFoundError("Tag")

        try:
            tag_name = tag.name
            await db.delete(tag)
            await db.commit()
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                f"Could not delete tag '{tag_name}'"
            ) from e
