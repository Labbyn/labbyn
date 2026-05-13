"""Pydantic dashboard models for database schemas."""

from typing import List

from pydantic import BaseModel


class DashboardItem(BaseModel):
    """Schema for dashboard item."""

    type: str
    id: str
    location: str
    tags: List[str]


class DashboardSection(BaseModel):
    """Schema for dashboard section."""

    name: str
    items: List[DashboardItem]


class DashboardResponse(BaseModel):
    """Schema for dashboard response."""

    sections: List[DashboardSection]
