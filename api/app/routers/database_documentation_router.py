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

@router.get("/db/documentation/", response_model=List[DocumentationResponse], tags=["Documentation"])
def get_documentation(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Get all documents from documentation
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all documents
    """
    query = db.query(Documentation).options(joinedload(Documentation.tags)).all()
    return query
