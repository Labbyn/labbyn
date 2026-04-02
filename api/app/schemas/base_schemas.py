"""Pydantic base models for database schemas."""

from enum import Enum

from pydantic import BaseModel, Field


class UserTypeEnum(str, Enum):
    """User types."""

    ADMIN = "admin"
    GROUP_ADMIN = "group_admin"
    USER = "user"


class EntityTypeEnum(str, Enum):
    """Entity types."""

    MACHINES = "machines"
    INVENTORY = "inventory"
    ROOM = "room"
    USER = "user"
    CATEGORIES = "categories"


class ActionTypeEnum(str, Enum):
    """Action types."""

    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


class VersionedBase(BaseModel):
    """Optimistic locking version."""

    version_id: int = Field(..., description="Optimistic locking version")
