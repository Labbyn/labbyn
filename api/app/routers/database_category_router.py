"""Router for Category Database API CRUD."""

from typing import List
from app.database import get_db
from app.db.models import (
    Categories,
)
from app.db.schemas import (
    CategoriesCreate,
    CategoriesResponse,
    CategoriesUpdate,
)
from app.utils.redis_service import acquire_lock
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.post(
    "/db/categories/",
    response_model=CategoriesResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Categories"],
)
def create_category(category_data: CategoriesCreate, db: Session = Depends(get_db)):
    """
    Create new category
    :param category_data: Category data
    :param db: Active database session
    :return: Category object
    """
    obj = Categories(**category_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/db/categories/", response_model=List[CategoriesResponse], tags=["Categories"]
)
def get_categories(db: Session = Depends(get_db)):
    """
    Fetch all categories
    :param db: Active database session
    :return: List of all categories
    """
    return db.query(Categories).all()


@router.get(
    "/db/categories/{cat_id}", response_model=CategoriesResponse, tags=["Categories"]
)
def get_category_by_id(cat_id: int, db: Session = Depends(get_db)):
    """
    Fetch specific category by ID
    :param cat_id: Category ID
    :param db: Active database session
    :return: Category object
    """
    cat = db.query(Categories).filter(Categories.id == cat_id).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    return cat


@router.put(
    "/db/categories/{cat_id}", response_model=CategoriesResponse, tags=["Categories"]
)
async def update_category(
    cat_id: int, cat_data: CategoriesUpdate, db: Session = Depends(get_db)
):
    """
    Update Category
    :param cat_id: Category ID
    :param cat_data: Category data schema
    :param db: Active database session
    :return: Updated Category
    """
    async with acquire_lock(f"category_lock:{cat_id}"):
        cat = db.query(Categories).filter(Categories.id == cat_id).first()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
            )
        for k, v in cat_data.model_dump(exclude_unset=True).items():
            setattr(cat, k, v)
        db.commit()
        db.refresh(cat)
        return cat


@router.delete(
    "/db/categories/{cat_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Categories"],
)
async def delete_category(cat_id: int, db: Session = Depends(get_db)):
    """
    Delete category
    :param cat_id: Category ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"category_lock:{cat_id}"):
        cat = db.query(Categories).filter(Categories.id == cat_id).first()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
            )
        db.delete(cat)
        db.commit()
