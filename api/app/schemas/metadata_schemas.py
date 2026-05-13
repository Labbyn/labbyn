"""Pydantic metadata models for database schemas."""

from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class MetadataBase(BaseModel):
    """Base model for Machine Metadata.

    Contains configuration flags and update info.
    """

    last_update: Optional[date] = Field(
        None, description="Date of the last metadata update"
    )
    agent_prometheus: Optional[bool] = Field(
        False, description="Flag indicating if Prometheus agent is active"
    )
    ansible_access: Optional[bool] = Field(
        False, description="Flag indicating if Ansible access is enabled"
    )
    ansible_root_access: Optional[bool] = Field(
        False, description="Flag indicating if Ansible root access is enabled"
    )


class MetadataCreate(MetadataBase):
    """Schema for creating Metadata."""


class MetadataUpdate(BaseModel):
    """Schema for updating Metadata."""

    last_update: Optional[date] = None
    agent_prometheus: Optional[bool] = None
    ansible_access: Optional[bool] = None
    ansible_root_access: Optional[bool] = None


class MetadataResponse(MetadataBase):
    """Schema for reading Metadata."""

    id: int
    version_id: int
    model_config = ConfigDict(from_attributes=True)
