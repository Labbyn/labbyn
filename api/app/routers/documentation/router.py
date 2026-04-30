"""Router for Documentation Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, Response, status

from app.auth import dependencies
from app.schemas import doc_schemas

from .service import DocumentationService

router = APIRouter(prefix="/db/documentation", tags=["Documentation"])


@router.get("", response_model=List[doc_schemas.DocumentationResponse])
async def get_documentation(
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get all documents from documentation.

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all documents.
    """
    return await DocumentationService(ctx.db, ctx).repo.get_all(ctx.db)


@router.post(
    "",
    response_model=doc_schemas.DocumentationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_documentation(
    documentation_data: doc_schemas.DocumentationCreate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get all documents from documentation.

    :param documentation_data: Documentation data schema
    :param ctx: Request context for user and team info
    :return: List of all documents.
    """
    return await DocumentationService(ctx.db, ctx).create_document(documentation_data)


@router.get("/{documentation_id}", response_model=doc_schemas.DocumentationResponse)
async def get_documentation_by_id(
    documentation_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get specific document from documentation by ID.

    :param documentation_id: Document ID
    :param ctx: Request context for user and team info
    :return: Document object.
    """
    return await DocumentationService(ctx.db, ctx).get_doc_or_404(documentation_id)


@router.patch("/{documentation_id}", response_model=doc_schemas.DocumentationResponse)
async def update_documentation(
    documentation_id: int,
    documentation_data: doc_schemas.DocumentationUpdate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update document data.

    :param documentation_id: Document ID
    :param documentation_data: Documentation data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated Document.
    """
    return await DocumentationService(ctx.db, ctx).update_document(
        documentation_id, documentation_data
    )


@router.delete("/{documentation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    documentation_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete document.

    :param documentation_id: Document ID
    :param ctx: Request context for user and team info
    :return: 204 No Content as success
    """
    await DocumentationService(ctx.db, ctx).delete_document(documentation_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
