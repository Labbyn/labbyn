"""Pydantic team models for database schemas."""

from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas import tag_schemas


class TeamsBase(BaseModel):
    """Base model for Teams."""

    name: str = Field(..., max_length=100, description="Name of the team")


class TeamsCreate(TeamsBase):
    """Schema for creating a Team."""


class TeamsUpdate(BaseModel):
    """Schema for updating a Team."""

    name: Optional[str] = None


class TeamsResponse(TeamsBase):
    """Schema for reading Team data."""

    id: int
    admins: str = Field(validation_alias="admin_names")
    model_config = ConfigDict(from_attributes=True)


class TeamMemberSchema(BaseModel):
    """Schema for representing a team member in the context of team details."""

    id: int
    full_name: str
    login: str
    email: str
    user_type: str
    is_group_admin: bool = False
    user_link: str


class TeamDetailResponse(BaseModel):
    """Schema for reading detailed Team information.

    Including members and admin details
    """

    id: int
    name: str
    admins: List[TeamMemberSchema] = Field(
        default=[], description="List of admins in the team"
    )
    members: List[TeamMemberSchema] = Field(
        default=[], description="List of members in the team"
    )
    member_count: int

    model_config = ConfigDict(from_attributes=True)


class TeamRackDetail(BaseModel):
    """Schema for representing a rack in the context of team details."""

    id: int
    name: str
    team_name: str
    tags: List[tag_schemas.TagsBase]
    map_link: str
    machines_count: int


class TeamMachineDetail(BaseModel):
    """Schema for representing a machine in the context of team details.

    Including its location and identifiers.
    """

    id: int
    name: str
    ip_address: Optional[str]
    mac_address: Optional[str]
    team_name: str
    rack_name: str
    shelf_order: int
    tags: List[tag_schemas.TagsBase]
    # TODO: add tags after CPU and Disk merge


class TeamInventoryDetail(BaseModel):
    """Schema for representing an inventory item in the context of team details.

    Including its location and rental status.
    """

    id: int
    name: str
    quantity: int
    team_name: str
    room_name: str
    machine_info: Optional[str]
    category_name: str
    rental_status: bool
    rental_id: Optional[int]
    location_link: str


class TeamFullDetailResponse(BaseModel):
    """Schema for reading full Team details.

    Including members, racks, machines and inventory items associated with the team.
    """

    id: int
    name: str
    admins: List[Dict[str, str]] = Field(default=[], description="List of team admins")
    members: List[TeamMemberSchema] = Field(
        default=[], description="List of members in the team"
    )
    racks: List[TeamRackDetail]
    machines: List[TeamMachineDetail]
    inventory: List[TeamInventoryDetail]
