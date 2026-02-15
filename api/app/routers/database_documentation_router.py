"""Router for Documentation Database API CRUD."""

from typing import List

from app.database import get_db
from app.db.models import Documentation, Tags
from app.db.schemas import (
    DocumentationCreate,
    DocumentationUpdate,
    DocumentationResponse,
)
from app.utils.redis_service import acquire_lock
from app.auth.dependencies import RequestContext
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

router = APIRouter()


@router.get(
    "/db/documentation/",
    response_model=List[DocumentationResponse],
    tags=["Documentation"],
)
def get_documentation(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Get all documents from documentation
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all documents
    """
    query = db.query(Documentation).options(joinedload(Documentation.tags)).all()
    return query


@router.post(
    "/db/documentation/",
    response_model=DocumentationResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Documentation"],
)
def create_documentation(
    documentation_data: DocumentationCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Create new document
    :param data: Documentation data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: New document item
    """
    tag_ids = documentation_data.tag_ids or []
    obj = Documentation(**documentation_data.model_dump(exclude={"tag_ids"}))
    if tag_ids:
        obj.tags = db.query(Tags).filter(Tags.id.in_(tag_ids)).all()
    db.add(obj)
    db.commit()
    db.refresh(obj)

    return obj


@router.get(
    "/db/documentation/{documentation_id}",
    response_model=DocumentationResponse,
    tags=["Documentation"],
)
def get_documentation_by_id(
    documentation_id: int,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Get specific document from documentation by ID
    :param documentation_id: Document ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Document object
    """
    query = (
        db.query(Documentation)
        .filter(Documentation.id == documentation_id)
        .options(joinedload(Documentation.tags))
    )
    document = query.first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )
    return document


@router.put(
    "/db/documentation/{documentation_id}",
    response_model=DocumentationResponse,
    tags=["Documentation"],
)
async def update_documentation(
    documentation_id: int,
    documentation_data: DocumentationUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Update document data
    :param documentation_id: Document ID
    :param documentation_data: Documentation data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated Document
    """
    async with acquire_lock(f"documentation_lock:{documentation_id}"):
        query = (
            db.query(Documentation)
            .filter(Documentation.id == documentation_id)
            .options(joinedload(Documentation.tags))
        )
        document = query.first()
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
            )
        update_data = documentation_data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(document, k, v)
        db.commit()
        db.refresh(document)
        return document


@router.delete(
    "/db/documentation/{documentation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Documentation"],
)
async def delete_document(
    documentation_id: int,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Delete document
    :param documentation_id: Document ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None
    """
    async with acquire_lock(f"documentation_lock:{documentation_id}"):
        query = (
            db.query(Documentation)
            .filter(Documentation.id == documentation_id)
            .options(joinedload(Documentation.tags))
        )
        document = query.first()
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
            )
        db.delete(document)
        db.commit()
