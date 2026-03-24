from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.utils import redis_service
from .repository import DocumentationRepository


class DocumentationService:
    """Service for managing Documentation articles and their tag associations."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init Documentation Service.

        :param db: Active asynchronous database session.
        :param ctx: Request context containing current user information.
        """
        self.db = db
        self.ctx = ctx
        self.repo = DocumentationRepository()

    async def get_doc_or_404(self, documentation_id: int) -> models.Documentation:
        """Internal helper to fetch a document or raise ObjectNotFoundError.
        :param documentation_id: ID of the document to fetch.

        :return: The fetched document.
        """
        doc = await self.repo.get_by_id(self.db, documentation_id)
        if not doc:
            raise exceptions.ObjectNotFoundError("Document")
        return doc

    async def create_document(self, doc_data):
        """Create a new document, link tags, and set current user as author.

        :param doc_data: Pydantic schema for document creation.
        :return: The newly created document with tags.
        :raises ConflictError: If a document with the same title already exists.
        :raises ValidationError: If creation fails.
        """
        self.ctx.require_user()
        tag_ids = doc_data.tag_ids or []

        try:
            obj = models.Documentation(
                **doc_data.model_dump(exclude={"tag_ids"}),
                author=self.ctx.current_user.login,
            )

            if tag_ids:
                obj.tags = await self.repo.get_tags_by_ids(self.db, tag_ids)

            self.db.add(obj)
            await self.db.flush()
            await self.db.commit()
            return await self.repo.get_by_id(self.db, obj.id)

        except IntegrityError:
            await self.db.rollback()
            raise exceptions.ConflictError(
                message=f"Document with title '{doc_data.title}' exists."
            )
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError(
                f"Could not create document: {doc_data.title}"
            ) from e

    async def update_document(self, documentation_id: int, doc_data):
        """Update an existing document and its tags with locking.

        :param documentation_id: ID of the document to update.
        :param doc_data: Pydantic schema with update fields.
        :return: The updated document.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"documentation_lock:{documentation_id}"):
            doc = await self.get_doc_or_404(documentation_id)
            old_title = doc.title

            try:
                update_dict = doc_data.model_dump(exclude_unset=True)

                if "tag_ids" in update_dict:
                    tag_ids = update_dict.pop("tag_ids")
                    doc.tags = await self.repo.get_tags_by_ids(self.db, tag_ids)

                for k, v in update_dict.items():
                    if hasattr(doc, k):
                        setattr(doc, k, v)

                await self.db.commit()
                return await self.repo.get_by_id(self.db, documentation_id)

            except IntegrityError:
                await self.db.rollback()
                raise exceptions.ConflictError(
                    message=f"Title '{doc_data.title or old_title}' is taken."
                )
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Failed to update document: {old_title}"
                ) from e

    async def delete_document(self, documentation_id: int):
        """Delete a document with locking.

        :param documentation_id: ID of the document to delete.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"documentation_lock:{documentation_id}"):
            doc = await self.get_doc_or_404(documentation_id)
            try:
                await self.db.delete(doc)
                await self.db.commit()
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Could not delete: {doc.title}"
                ) from e
