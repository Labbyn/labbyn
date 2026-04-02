"""Pydantic command search models for search bar."""

from typing import List, Optional

from pydantic import BaseModel


class SearchItem(BaseModel):
    """Basic search item model."""

    id: int
    label: str
    sublabel: Optional[str] = None
    target_url: str

    class Config:
        from_attributes = True


class GroupedSearchResponse(BaseModel):
    """Model for command search."""

    machines: List[SearchItem] = []
    users: List[SearchItem] = []
    racks: List[SearchItem] = []
    teams: List[SearchItem] = []
    rooms: List[SearchItem] = []
    inventory: List[SearchItem] = []
    documentation: List[SearchItem] = []
