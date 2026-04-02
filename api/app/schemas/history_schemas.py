"""Pydantic history models for database schemas."""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas import base_schemas, user_schemas


class HistoryBase(BaseModel):
    """Base model for History logs."""

    entity_type: base_schemas.EntityTypeEnum = Field(
        ..., description="Type of entity changed (e.g., machine, user)"
    )
    action: base_schemas.ActionTypeEnum = Field(
        ..., description="Action performed (create, update, delete)"
    )
    entity_id: int = Field(..., description="ID of the entity that was changed")
    user_id: Optional[int] = Field(
        None, description="ID of the user who performed the action"
    )
    before_state: Optional[Dict[str, Any]] = Field(
        None, description="JSON state before change"
    )
    after_state: Optional[Dict[str, Any]] = Field(
        None, description="JSON state after change"
    )
    can_rollback: bool = Field(
        True, description="Flag indicating if this action can be undone"
    )
    extra_data: Optional[Dict[str, Any]] = Field(
        None, description="Additional metadata in JSON format"
    )


class HistoryCreate(HistoryBase):
    """Schema for creating a History log entry."""


class HistoryResponse(HistoryBase):
    """Schema for reading History logs."""

    id: int
    timestamp: datetime = Field(..., description="Exact time when the action occurred")
    model_config = ConfigDict(from_attributes=True)


class HistoryEnhancedResponse(HistoryResponse):
    """Enhanced history schema with resolved entity names and user details.

    Inherits fields like timestamp, action, extra_data from HistoryResponse.
    """

    entity_name: Optional[str] = Field(
        None, description="Readable name of the entity (resolved from DB or logs)"
    )

    user: Optional[user_schemas.UserShortResponse] = Field(
        None, description="User who performed the action"
    )
