"""Pydantic map models for database schemas."""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class WallNodes(BaseModel):
    id: Optional[int] = None
    name: str
    x: float
    y: float
    model_config = ConfigDict(from_attributes=True)


class WallSegments(BaseModel):
    id: Optional[int] = None
    name: str
    node1_name: str
    node2_name: str
    model_config = ConfigDict(from_attributes=True)


class Equipment(BaseModel):
    id: Optional[int] = None
    name: str
    eq_type: str
    x: float
    y: float
    rotation: float = 0.0
    label: Optional[str] = None
    rack_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class Labels(BaseModel):
    id: Optional[int] = None
    name: str
    x: float
    y: float
    color: str
    model_config = ConfigDict(from_attributes=True)


class MapUpdate(BaseModel):
    wall_nodes: List[WallNodes]
    wall_segments: List[WallSegments]
    equipment: List[Equipment]
    labels: List[Labels]


class MapResponse(BaseModel):
    id: int
    room_id: int
    nodes: List[WallNodes]
    segments: List[WallSegments]
    equipment: List[Equipment]
    labels: List[Labels]
    model_config = ConfigDict(from_attributes=True)
