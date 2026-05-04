"""Pydantic category models for database schemas."""

from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field

from .inventory_schemas import InventoryBase

class CategoriesBase(BaseModel):
    """Base model for Inventory Categories."""

    name: str = Field(..., max_length=50, description="Name of the category")


class CategoriesCreate(CategoriesBase):
    """Schema for creating a Category."""


class CategoriesUpdate(BaseModel):
    """Schema for updating a Category."""

    name: Optional[str] = Field(None, max_length=50)


class CategoriesResponse(CategoriesBase):
    """Schema for reading Category data."""

    id: int
    version_id: int
    model_config = ConfigDict(from_attributes=True)

class CategoryGroupedResponse(BaseModel):
    category_name: str
    quantity: int
    item_group: List[InventoryBase]
