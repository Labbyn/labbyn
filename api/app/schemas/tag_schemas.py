"""Pydantic tag models for database schemas."""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class TagsBase(BaseModel):
    """Base model for Tags containing shared attributes."""

    name: str = Field(..., max_length=50, description="Unique name of the tag")
    color: str = Field(..., max_length=50, description="Color hex or name")


class TagsCreate(TagsBase):
    """Used for creating a new tag in the system."""

    pass


class TagsUpdate(BaseModel):
    """Used for updating tag metadata."""

    name: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=50)


class TagsResponse(TagsBase):
    """Standard tag response."""

    id: int
    version_id: int

    model_config = ConfigDict(from_attributes=True)


class TagsAssignment(BaseModel):
    """Used for tag assignment to various entities like rooms, machines, etc."""

    tag_ids: List[int]
    entity_id: int
    entity_type: str
