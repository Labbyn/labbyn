"""Pydantic disk models for database schemas."""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class DisksBase(BaseModel):
    """Base model for Disks."""

    id: int
    name: str
    capacity: Optional[str]


class DiskCreate(DisksBase):
    """Schema for creating disks."""

    machine_id: int


class DiskUpdate(DisksBase):
    """Schema for updating disks."""

    name: Optional[str] = Field(None, max_length=100, description="Disk naming")
    capacity: Optional[str] = Field(None, max_length=50, description="Disk capacity")


class DiskResponse(DisksBase):
    """Schema for reading disks."""

    id: int
    name: str
    capacity: Optional[str]
    machine_id: int
    model_config = ConfigDict(from_attributes=True)
