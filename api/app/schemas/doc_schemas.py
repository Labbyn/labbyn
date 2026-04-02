"""Pydantic documentation models for database schemas."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas import tag_schemas


class DocumentationBase(BaseModel):
    """Base model containing all shared attributes from the DB."""

    title: str = Field(
        ..., max_length=50, description="Unique title of the documentation"
    )
    added_on: datetime = Field(default_factory=datetime.now)
    modified_on: Optional[datetime] = None
    content: str = Field(..., max_length=5000, description="Documentation content")


class DocumentationCreate(DocumentationBase):
    """Extend base doc model by Tags."""

    tag_ids: Optional[List[int]] = Field(
        default=[], description="List of existing Tag IDs"
    )


class DocumentationUpdate(BaseModel):
    """Schema for documentation update."""

    title: Optional[str] = Field(None, max_length=50)
    content: Optional[str] = Field(
        None, max_length=5000, description="Documentation content"
    )
    modified_on: datetime = Field(default_factory=datetime.now)
    tag_ids: Optional[List[int]] = None


class DocumentationResponse(DocumentationBase):
    """Schema for adding documentation."""

    id: int
    author: str
    added_on: datetime
    modified_on: Optional[datetime]
    version_id: int

    tags: List[tag_schemas.TagsResponse] = []

    model_config = ConfigDict(from_attributes=True)
