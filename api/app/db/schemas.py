"""Pydantic schemas for the application's API endpoints."""

from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.db.models import UserType


# ==========================
#          ENUMS
# ==========================


class UserTypeEnum(str, Enum):
    """
    Enumeration of user roles within the system.
    """

    ADMIN = "admin"
    GROUP_ADMIN = "group_admin"
    USER = "user"


class EntityTypeEnum(str, Enum):
    """
    Enumeration of entity types used for history tracking.
    """

    MACHINES = "machines"
    INVENTORY = "inventory"
    ROOM = "room"
    USER = "user"
    CATEGORIES = "categories"


class ActionTypeEnum(str, Enum):
    """
    Enumeration of action types performed on entities.
    """

    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


# ==========================
#          COMMON
# ==========================


class VersionedBase(BaseModel):
    """
    Base model for versioned entities.
    """

    version_id: int = Field(..., description="Optimistic locking version")


# ==========================
#          LAYOUT
# ==========================


class LayoutBase(BaseModel):
    """
    Base model for Layout containing shared attributes.
    Represents 2D coordinates on a map/plan.
    """

    x: int = Field(..., description="X coordinate on the grid")
    y: int = Field(..., description="Y coordinate on the grid")


class LayoutCreate(LayoutBase):
    """Schema for creating a new Layout."""


class LayoutUpdate(BaseModel):
    """
    Schema for updating an existing Layout.
    All fields are optional to allow partial updates.
    """

    x: Optional[int] = Field(None, description="New X coordinate")
    y: Optional[int] = Field(None, description="New Y coordinate")


class LayoutResponse(LayoutBase):
    """
    Schema for reading Layout data (Response).
    Includes the database ID.
    """

    id: int = Field(..., description="Unique identifier of the layout")
    version_id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================
#          ROOMS
# ==========================


class RoomsBase(BaseModel):
    """
    Base model for Rooms containing shared attributes.
    """

    name: str = Field(..., max_length=100, description="Unique name of the room")
    room_type: Optional[str] = Field(
        None, max_length=100, description="Type or classification of the room"
    )


class RoomsCreate(RoomsBase):
    """Schema for creating a new Room."""


class RoomsUpdate(BaseModel):
    """
    Schema for updating a Room.
    All fields are optional.
    """

    name: Optional[str] = Field(None, max_length=100)
    room_type: Optional[str] = Field(None, max_length=100)


class RoomsResponse(RoomsBase):
    """
    Schema for reading Room data.
    """

    id: int = Field(..., description="Unique identifier of the room")
    version_id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================
#          LAYOUTS
# ==========================


class LayoutsBase(BaseModel):
    """
    Base model for Layouts (Association table between Room and Layout coordinates).
    """

    name: str = Field(
        ..., max_length=100, description="Name of the specific layout configuration"
    )
    room_id: int = Field(..., description="ID of the associated room")
    layout_id: int = Field(
        ..., description="ID of the associated layout coordinate set"
    )


class LayoutsCreate(LayoutsBase):
    """Schema for creating a new Layout association."""


class LayoutsUpdate(BaseModel):
    """
    Schema for updating a Layout association.
    """

    name: Optional[str] = Field(None, max_length=100)
    room_id: Optional[int] = None
    layout_id: Optional[int] = None


class LayoutsResponse(LayoutsBase):
    """
    Schema for reading Layout association data.
    """

    id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================
#          CATEGORIES
# ==========================


class CategoriesBase(BaseModel):
    """
    Base model for Inventory Categories.
    """

    name: str = Field(..., max_length=50, description="Name of the category")


class CategoriesCreate(CategoriesBase):
    """Schema for creating a Category."""


class CategoriesUpdate(BaseModel):
    """
    Schema for updating a Category.
    """

    name: Optional[str] = Field(None, max_length=50)


class CategoriesResponse(CategoriesBase):
    """
    Schema for reading Category data.
    """

    id: int
    version_id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================
#          METADATA
# ==========================


class MetadataBase(BaseModel):
    """
    Base model for Machine Metadata.
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
    """
    Schema for updating Metadata.
    """

    last_update: Optional[date] = None
    agent_prometheus: Optional[bool] = None
    ansible_access: Optional[bool] = None
    ansible_root_access: Optional[bool] = None


class MetadataResponse(MetadataBase):
    """
    Schema for reading Metadata.
    """

    id: int
    version_id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================
#          TEAMS
# ==========================


class TeamsBase(BaseModel):
    """
    Base model for Teams.
    """

    name: str = Field(..., max_length=100, description="Name of the team")
    team_admin_id: int = Field(
        ..., description="ID of the user who is the admin of this team"
    )


class TeamsCreate(TeamsBase):
    """Schema for creating a Team."""


class TeamsUpdate(BaseModel):
    """
    Schema for updating a Team.
    """

    name: Optional[str] = None
    team_admin_id: Optional[int] = None


class TeamsResponse(TeamsBase):
    """
    Schema for reading Team data.
    """

    id: int
    version_id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================
#          USER
# ==========================


class UserBase(BaseModel):
    """
    Base model for Users containing shared public attributes.
    NOTE: Does NOT contain password.
    """

    name: str = Field(..., max_length=50, description="User's first name")
    surname: str = Field(..., max_length=80, description="User's last name")
    login: str = Field(..., max_length=30, description="Unique login username")
    email: Optional[EmailStr] = Field(None, description="User's email address")
    user_type: UserTypeEnum = Field(
        ..., max_length=50, description="User's role in the system"
    )
    team_id: Optional[int] = Field(
        None, description="ID of the team the user belongs to"
    )


class UserCreate(UserBase):
    """
    Schema for creating a new User.
    REQUIRES a password field.
    """

    password: Optional[str] = Field(
        None,
        min_length=6,
        max_length=255,
        description="Optional manual password; if not provided, a random one will be generated",
    )


class UserUpdate(BaseModel):
    """
    Schema for updating a User.
    Allows updating profile info or password separately.
    """

    name: Optional[str] = Field(None, max_length=50)
    surname: Optional[str] = Field(None, max_length=80)
    team_id: Optional[int] = None
    email: Optional[EmailStr] = None
    login: Optional[str] = Field(None, max_length=30)
    password: Optional[str] = Field(
        None,
        min_length=6,
        max_length=255,
        description="New password if change is requested",
    )


class UserResponse(UserBase):
    """
    Schema for reading User data.
    EXCLUDES the password for security reasons.
    """

    id: int
    version_id: int
    model_config = ConfigDict(from_attributes=True)


class UserCreatedResponse(UserResponse):
    """
    Schema for reading User data upon creation.
    INCLUDES the generated password.
    """

    generated_password: Optional[str] = Field(
        None, description="Generated password if one was created"
    )


# ==========================
#          MACHINES
# ==========================


class MachinesBase(BaseModel):
    """
    Base model for Machines.
    """

    name: str = Field(..., max_length=100, description="Unique machine name/hostname")
    localization_id: int = Field(
        ..., description="ID of the room where machine is located"
    )
    mac_address: Optional[str] = Field(None, max_length=17, description="MAC Address")
    pdu_port: Optional[int] = Field(
        None, description="Power Distribution Unit port number"
    )
    team_id: Optional[int] = Field(
        None, description="ID of the team owning the machine"
    )
    os: Optional[str] = Field(None, max_length=30, description="Operating System")
    serial_number: Optional[str] = Field(
        None, max_length=50, description="Hardware serial number"
    )
    note: Optional[str] = Field(None, max_length=500, description="Optional notes")
    cpu: Optional[str] = Field(None, max_length=100, description="CPU specification")
    ram: Optional[str] = Field(None, max_length=100, description="RAM specification")
    disk: Optional[str] = Field(
        None, max_length=100, description="Disk/Storage specification"
    )
    metadata_id: int = Field(..., description="ID of associated metadata record")
    layout_id: Optional[int] = Field(
        None, description="ID of layout coordinates if applicable"
    )


class MachinesCreate(MachinesBase):
    """
    Schema for creating a Machine.
    """

    added_on: datetime = Field(
        default_factory=datetime.now,
        description="Date when machine was added. Defaults to now.",
    )


class MachinesUpdate(BaseModel):
    """
    Schema for updating a Machine.
    """

    name: Optional[str] = Field(None, max_length=100)
    localization_id: Optional[int] = None
    mac_address: Optional[str] = Field(None, max_length=17)
    pdu_port: Optional[int] = None
    team_id: Optional[int] = None
    os: Optional[str] = Field(None, max_length=30)
    serial_number: Optional[str] = Field(None, max_length=50)
    note: Optional[str] = Field(None, max_length=500)
    cpu: Optional[str] = Field(None, max_length=100)
    ram: Optional[str] = Field(None, max_length=100)
    disk: Optional[str] = Field(None, max_length=100)
    layout_id: Optional[int] = None
    metadata_id: Optional[int] = None


class MachinesResponse(MachinesBase):
    """
    Schema for reading Machine data.
    """

    id: int
    added_on: datetime
    version_id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================
#          RENTALS
# ==========================


class RentalsBase(BaseModel):
    """
    Base model for Rentals.
    """

    item_id: int = Field(..., description="ID of the inventory item being rented")
    start_date: date = Field(..., description="Start date of the rental")
    end_date: date = Field(..., description="End date of the rental")
    user_id: int = Field(..., description="ID of the user renting the item")


class RentalsCreate(RentalsBase):
    """Schema for creating a Rental record."""


class RentalsUpdate(BaseModel):
    """
    Schema for updating a Rental record.
    """

    item_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    user_id: Optional[int] = None


class RentalsResponse(RentalsBase):
    """
    Schema for reading Rental data.
    """

    id: int
    version_id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================
#          INVENTORY
# ==========================


class InventoryBase(BaseModel):
    """
    Base model for Inventory items.
    """

    name: str = Field(..., max_length=100, description="Name of the item")
    quantity: int = Field(..., description="Quantity available")
    team_id: Optional[int] = Field(None, description="ID of the team owning the item")
    localization_id: int = Field(
        ..., description="ID of the room where item is located"
    )
    machine_id: Optional[int] = Field(
        None, description="ID of the machine if item is part of one"
    )
    category_id: int = Field(..., description="ID of the item category")
    rental_status: bool = Field(False, description="True if item is currently rented")
    rental_id: Optional[int] = Field(
        None, description="ID of the current active rental"
    )


class InventoryCreate(InventoryBase):
    """Schema for creating an Inventory item."""


class InventoryUpdate(BaseModel):
    """
    Schema for updating an Inventory item.
    """

    name: Optional[str] = Field(None, max_length=100)
    quantity: Optional[int] = None
    team_id: Optional[int] = None
    localization_id: Optional[int] = None
    machine_id: Optional[int] = None
    category_id: Optional[int] = None
    rental_status: Optional[bool] = None
    rental_id: Optional[int] = None


class InventoryResponse(InventoryBase):
    """
    Schema for reading Inventory data.
    """

    id: int
    version_id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================
#          HISTORY
# ==========================


class HistoryBase(BaseModel):
    """
    Base model for History logs.
    """

    entity_type: EntityTypeEnum = Field(
        ..., description="Type of entity changed (e.g., machine, user)"
    )
    action: ActionTypeEnum = Field(
        ..., description="Action performed (create, update, delete)"
    )
    entity_id: int = Field(..., description="ID of the entity that was changed")
    user_id: Optional[int] = Field(
        None, description="ID of the user who performed the action"
    )
    before_state: Optional[Dict[str, Any]] = Field(
        None, description="JSON state before change"
    )
    after_state: Optional[Dict[str, Any]] = Field(
        None, description="JSON state after change"
    )
    can_rollback: bool = Field(
        True, description="Flag indicating if this action can be undone"
    )
    extra_data: Optional[Dict[str, Any]] = Field(
        None, description="Additional metadata in JSON format"
    )


class HistoryCreate(HistoryBase):
    """Schema for creating a History log entry."""


class HistoryResponse(HistoryBase):
    """
    Schema for reading History logs.
    """

    id: int
    timestamp: datetime = Field(..., description="Exact time when the action occurred")
    model_config = ConfigDict(from_attributes=True)


# ==========================
#       EXTRA MODELS
# ==========================


class UserShortResponse(BaseModel):
    """
    Short schema for User data (e.g., in lists or logs).
    Only login is needed for audit logs.
    """

    login: str
    model_config = ConfigDict(from_attributes=True)


class HistoryEnhancedResponse(HistoryResponse):
    """
    Enhanced history schema with resolved entity names and user details.
    Inherits fields like timestamp, action, extra_data from HistoryResponse.
    """

    entity_name: Optional[str] = Field(
        None, description="Readable name of the entity (resolved from DB or logs)"
    )

    user: Optional[UserShortResponse] = Field(
        None, description="User who performed the action"
    )
