"""Pydantic rack and shelf models for database schemas."""

from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas import machine_schemas, tag_schemas


class ShelfBase(BaseModel):
    """Base model for Shelf containing shared attributes.

    Represents a shelf within a rack, which can hold machines or inventory.
    """

    name: str = Field(..., max_length=100, description="Name of the shelf")
    order: int = Field(..., description="Order of the shelf within the rack")


class ShelfCreate(ShelfBase):
    """Schema for creating a new Shelf."""

    pass


class ShelfUpdate(BaseModel):
    """Schema for updating an existing Shelf.

    All fields are optional to allow partial updates.
    """

    name: Optional[str] = Field(None, max_length=100)
    order: Optional[int] = None
    rack_id: Optional[int] = None


class ShelfResponse(BaseModel):
    """Schema for reading Shelf data (Response).

    Includes the database ID.
    """

    id: int = Field(..., description="Unique identifier of the shelf")
    name: Optional[str] = Field(None, max_length=100, description="Name of the shelf")
    order: int = Field(None, description="Order of the shelf within the rack")
    rack_id: int = Field(..., description="Unique identifier of the rack")
    rack_name: Optional[str] = Field(None, description="Name of the rack")
    machines: List[machine_schemas.MachineInRackResponse] = []
    model_config = ConfigDict(from_attributes=True)


class RackBase(BaseModel):
    """Base model for Rack containing shared attributes.

    Represents a rack that can contain multiple shelves.
    """

    name: str = Field(..., max_length=100, description="Name of the rack")
    room_id: int = Field(..., description="Location of the rack")
    team_id: Optional[int] = Field(
        None, description="ID of the team that owns this rack (if applicable)"
    )


class RackCreate(RackBase):
    """Schema for creating a new Rack."""

    tag_ids: Optional[List[int]] = Field(
        default=[], description="List of existing Tag IDs to associate with this rack"
    )
    size: Optional[int] = Field(
        None, ge=0, le=100, description="Number of shelves to auto-generate (max 100)"
    )


class RackUpdate(BaseModel):
    """Schema for updating an existing Rack.

    All fields are optional to allow partial updates.
    """

    name: Optional[str] = Field(None, max_length=100, description="Name of the rack")
    room_id: Optional[int] = Field(None, description="Location of the rack")
    team_id: Optional[int] = Field(
        None, description="ID of the team that owns this rack (if applicable)"
    )
    tag_ids: Optional[List[int]] = Field(
        default=[], description="List of existing Tag IDs to associate with this rack"
    )
    machines: Optional[List[Any]] = Field(
        default=[],
        description="List of existing machines with associated shelf orders to place in the rack",
    )


class RackResponse(RackBase):
    """Schema for reading Rack data (Response).

    Includes the database ID and nested shelves.
    """

    id: int = Field(..., description="Unique identifier of the rack")
    room_name: Optional[str] = None
    team_name: Optional[str] = None
    tags: List[tag_schemas.TagsResponse] = []
    shelves: List[ShelfResponse] = []
    model_config = ConfigDict(from_attributes=True)


class RackWithOrderedMachinesResponse(RackBase):
    """Schema for reading Machines within Rack."""

    id: int = Field(..., description="Unique identifier of the rack")
    team_name: Optional[str]
    tags: List[tag_schemas.TagsResponse] = []
    machines: List[List[machine_schemas.MachineInRackResponse]] = [[]]
    link: str
