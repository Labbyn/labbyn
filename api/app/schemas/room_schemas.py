"""Pydantic room models for database schemas."""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas import tag_schemas


class RoomsBase(BaseModel):
    """Base model for Rooms containing shared attributes."""

    name: str = Field(..., max_length=100, description="Unique name of the room")
    room_type: Optional[str] = Field(
        None, max_length=100, description="Type or classification of the room"
    )
    team_id: Optional[int] = Field(None)


class RoomsCreate(RoomsBase):
    """Schema for creating a new Room."""

    tag_ids: Optional[List[int]] = Field(
        default=[], description="List of existing Tag IDs to associate with this room"
    )


class RoomsUpdate(BaseModel):
    """Schema for updating a Room.

    All fields are optional.
    """

    name: Optional[str] = Field(None, max_length=100)
    room_type: Optional[str] = Field(None, max_length=100)
    tag_ids: Optional[List[int]] = Field(None)


class RoomsResponse(RoomsBase):
    """Schema for reading Room data."""

    id: int = Field(..., description="Unique identifier of the room")
    version_id: int
    tags: List[tag_schemas.TagsResponse] = []
    map_link: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class RoomDashboardResponse(BaseModel):
    """Schema for displaying room information on the dashboard.

    Including rack count and map link.
    """

    id: int
    name: str
    team_name: str
    rack_count: int
    map_link: Optional[str] = None


class LabRackMachine(BaseModel):
    """Schema for displaying machine information within a rack section."""

    id: int
    hostname: Optional[str]
    ip_address: Optional[str]
    mac_address: Optional[str]


class LabRackSection(BaseModel):
    """Schema for displaying rack information within a room on the lab details view.

    Including its machines.
    """

    id: int
    name: str
    tags: List[tag_schemas.TagsBase]
    machines: List[LabRackMachine]


class RoomDetailsResponse(BaseModel):
    """Schema for displaying detailed room information on the lab details view.

    including its racks and machines.
    """

    id: int
    name: str
    tags: List[str]
    map_link: Optional[str] = None
    racks: List[LabRackSection]

    model_config = ConfigDict(from_attributes=True)
