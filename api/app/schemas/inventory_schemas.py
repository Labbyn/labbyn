"""Pydantic inventory and rental models for database schemas."""

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class RentalsBase(BaseModel):
    """Base model for Rentals."""

    item_id: int = Field(..., description="ID of the inventory item being rented")
    start_date: date = Field(..., description="Start date of the rental")
    end_date: date = Field(..., description="End date of the rental")
    quantity: int = Field(..., ge=1, description="Number of items to rent")


class RentalsCreate(RentalsBase):
    """Schema for creating a Rental record."""


class RentalsUpdate(BaseModel):
    """Schema for updating a Rental record."""

    item_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    user_id: Optional[int] = None


class RentalsResponse(RentalsBase):
    """Schema for reading Rental data."""

    id: int
    version_id: int
    model_config = ConfigDict(from_attributes=True)


class RentalInfo(BaseModel):
    """Schema for reading Rental info."""

    id: int
    borrower_name: str
    borrower_team: str
    quantity: int
    end_date: date


class RentalReturn(BaseModel):
    """Schema for returning rental."""

    quantity: Optional[int] = Field(
        None,
        ge=1,
        description="Quantity being returned; if not provided, assumes full return",
    )

class InventoryModelBase(BaseModel):
    """Base model for Inventory dictionary (Katalog)."""
    name: str = Field(..., max_length=100, description="Name of the equipment model")
    category_id: int = Field(..., description="ID of the item category")


class InventoryModelCreate(InventoryModelBase):
    """Schema for creating a new dictionary equipment model."""


class InventoryModelResponse(InventoryModelBase):
    """Schema for reading Inventory dictionary model data."""
    id: int
    version_id: int
    model_config = ConfigDict(from_attributes=True)


class InventoryBase(BaseModel):
    """Base model for Inventory items."""

    model_id: int = Field(..., description="Id of the InventoryModel")
    quantity: int = Field(..., description="Quantity available")
    team_id: Optional[int] = Field(None, description="ID of the team owning the item")
    localization_id: Optional[int] = Field(
        ..., description="ID of the room where item is located"
    )
    machine_id: Optional[int] = Field(
        None, description="ID of the machine if item is part of one"
    )
    rental_status: bool = Field(False, description="True if item is currently rented")
    rental_id: Optional[int] = Field(
        None, description="ID of the current active rental"
    )


class InventoryCreate(InventoryBase):
    """Schema for creating an Inventory item."""


class InventoryUpdate(BaseModel):
    """Schema for updating an Inventory item."""

    model_id: Optional[int] = None
    quantity: Optional[int] = None
    team_id: Optional[int] = None
    localization_id: Optional[int] = None
    machine_id: Optional[int] = None
    rental_status: Optional[bool] = None
    rental_id: Optional[int] = None


class InventoryResponse(InventoryBase):
    """Schema for reading Inventory data."""

    id: int
    version_id: int
    model_config = ConfigDict(from_attributes=True)


class InventoryDetailResponse(BaseModel):
    """Schema for reading Invetory details."""

    id: int
    name: str
    model_id: int
    quantity: int
    team_id: Optional[int]
    team_name: str
    room_name: str
    room_id: Optional[int]
    machine_info: Optional[str]
    category_name: str
    category_id: Optional[int]
    location_link: str
    active_rentals: List[RentalInfo] = []

    model_config = ConfigDict(from_attributes=True)

class InventoryModelGroupedResponse(BaseModel):
    """Schema for grouped inventory items by their dictionary model."""
    model_id: int
    model_name: str
    category_name: str
    total_quantity: int
    model_items: List[InventoryDetailResponse]
