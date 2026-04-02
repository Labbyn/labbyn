"""Pydantic CPU models for database schemas."""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CPUBase(BaseModel):
    """Base model for CPUs."""

    id: int
    name: str


class CPUCreate(CPUBase):
    """Schema for creating CPUs."""

    machine_id: int


class CPUUpdate(CPUBase):
    """Schema for updating CPUs."""

    name: Optional[str] = Field(None, max_length=100, description="CPU naming")


class CPUResponse(CPUBase):
    """Schema for reading cpus."""

    id: int
    name: str
    machine_id: int
    model_config = ConfigDict(from_attributes=True)
