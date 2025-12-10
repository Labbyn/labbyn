from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, IntegrityError
from typing import List
from datetime import date
from passlib.context import CryptContext
from app.db.models import (
    User, UserType, Machines, Inventory, Rentals,
    Rooms, Categories, Teams, Layout, Layouts, Metadata, History
)

from app.database import get_db
from app.utils.redis_service import acquire_lock

# Importy Schematów Pydantic
from app.db.schemas import (
    UserCreate, UserUpdate, UserResponse,
    MachinesCreate, MachinesUpdate, MachinesResponse,
    InventoryCreate, InventoryUpdate, InventoryResponse,
    RentalsCreate, RentalsResponse,
    RoomsCreate, RoomsUpdate, RoomsResponse,
    CategoriesCreate, CategoriesUpdate, CategoriesResponse,
    TeamsCreate, TeamsUpdate, TeamsResponse,
    LayoutCreate, LayoutUpdate, LayoutResponse,
    LayoutsCreate, LayoutsUpdate, LayoutsResponse,
    MetadataCreate, MetadataUpdate, MetadataResponse
)

# Konfiguracja haszowania haseł
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

router = APIRouter()

# ==========================================
# USERS
# ==========================================

@router.post("/db/users/", response_model=UserResponse, status_code=status.HTTP_201_CREATED, tags=["Users"])
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Create and add new user to database
    :param user_data: User data
    :param db: Active database session
    :return: New user
    """
    if db.query(User).filter(User.login == user_data.login).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Login already exists.")

    hashed_pw = hash_password(user_data.password)
    user_dict = user_data.model_dump(exclude={"password"})
    new_user = User(**user_dict, password=hashed_pw, user_type=UserType.USER)

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/db/users/", response_model=List[UserResponse], tags=["Users"])
def get_users(db: Session = Depends(get_db)):
    """
    Fetch all users
    :param db: Active database session
    :return: List of all users
    """
    return db.query(User).all()

@router.get("/db/users/{user_id}", response_model=UserResponse, tags=["Users"])
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    """
    Fetch specific user by ID
    :param user_id: User ID
    :param db: Active database session
    :return: User object
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.put("/db/users/{user_id}", response_model=UserResponse, tags=["Users"])
async def update_user(user_id: int, user_data: UserUpdate, db: Session = Depends(get_db)):
    """
    Update user data
    :param user_id: User ID
    :param user_data: User data schema
    :param db: Active database session
    :return: Updated User
    """
    async with acquire_lock(f"user_lock:{user_id}"):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        data = user_data.model_dump(exclude_unset=True)
        if "password" in data:
            data["password"] = hash_password(data["password"])

        for k, v in data.items():
            setattr(user, k, v)

        db.commit()
        db.refresh(user)
        return user

@router.delete("/db/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Users"])
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Delete user
    :param user_id: User ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"user_lock:{user_id}"):
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        db.delete(user)
        db.commit()


# ==========================================
# MACHINES
# ==========================================

@router.post("/db/machines/", response_model=MachinesResponse, status_code=status.HTTP_201_CREATED, tags=["Machines"])
def create_machine(machine_data: MachinesCreate, db: Session = Depends(get_db)):
    """
    Create and add new machine to database
    :param machine_data: Machine data
    :param db: Active database session
    :return: Machine object
    """
    obj = Machines(**machine_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/db/machines/", response_model=List[MachinesResponse], tags=["Machines"])
def get_machines(db: Session = Depends(get_db)):
    """
    Fetch all machines
    :param db: Active database session
    :return: List of machines
    """
    return db.query(Machines).all()

@router.get("/db/machines/{machine_id}", response_model=MachinesResponse, tags=["Machines"])
def get_machine_by_id(machine_id: int, db: Session = Depends(get_db)):
    """
    Fetch specific machine by ID
    :param machine_id: Machine ID
    :param db: Active database session
    :return: Machine object
    """
    machine = db.query(Machines).filter(Machines.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found")
    return machine

@router.put("/db/machines/{machine_id}", response_model=MachinesResponse, tags=["Machines"])
async def update_machine(machine_id: int, machine_data: MachinesUpdate, db: Session = Depends(get_db)):
    """
    Update machine data
    :param machine_id: Machine ID
    :param machine_data: Machine data schema
    :param db: Active database session
    :return: Updated Machine
    """
    async with acquire_lock(f"machine_lock:{machine_id}"):
        machine = db.query(Machines).filter(Machines.id == machine_id).first()
        if not machine:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found")
        for k, v in machine_data.model_dump(exclude_unset=True).items():
            setattr(machine, k, v)
        db.commit()
        db.refresh(machine)
        return machine

@router.delete("/db/machines/{machine_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Machines"])
async def delete_machine(machine_id: int, db: Session = Depends(get_db)):
    """
    Delete Machine
    :param machine_id: Machine ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"machine_lock:{machine_id}"):
        machine = db.query(Machines).filter(Machines.id == machine_id).first()
        if not machine:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Machine not found")
        db.delete(machine)
        db.commit()


# ==========================================
# INVENTORY
# ==========================================

@router.post("/db/inventory/", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED, tags=["Inventory"])
def create_item(inventory_data: InventoryCreate, db: Session = Depends(get_db)):
    """
    Create and add new inventory to database
    :param inventory_data: Inventory data
    :param db: Active database session
    :return: Inventory item
    """
    obj = Inventory(**inventory_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/db/inventory/", response_model=List[InventoryResponse], tags=["Inventory"])
def get_inventory(db: Session = Depends(get_db)):
    """
    Fetch all inventory items
    :param db: Active database session
    :return: List of inventory items
    """
    return db.query(Inventory).all()

@router.get("/db/inventory/{item_id}", response_model=InventoryResponse, tags=["Inventory"])
def get_inventory_item(item_id: int, db: Session = Depends(get_db)):
    """
    Fetch specific inventory item by ID
    :param item_id: Item ID
    :param db: Active database session
    :return: Inventory item
    """
    item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item

@router.put("/db/inventory/{item_id}", response_model=InventoryResponse, tags=["Inventory"])
async def update_item(item_id: int, item_data: InventoryUpdate, db: Session = Depends(get_db)):
    """
    Update item in inventory
    :param item_id: Item ID
    :param item_data: Item data schema
    :param db: Active database session
    :return: Updated Inventory item
    """
    async with acquire_lock(f"inventory_lock:{item_id}"):
        item = db.query(Inventory).filter(Inventory.id == item_id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        for k, v in item_data.model_dump(exclude_unset=True).items():
            setattr(item, k, v)
        db.commit()
        db.refresh(item)
        return item

@router.delete("/db/inventory/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Inventory"])
async def delete_item(item_id: int, db: Session = Depends(get_db)):
    """
    Delete item in inventory
    :param item_id: Item ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"inventory_lock:{item_id}"):
        item = db.query(Inventory).filter(Inventory.id == item_id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        db.delete(item)
        db.commit()


# ==========================================
# RENTALS
# ==========================================

@router.post("/db/rentals/", response_model=RentalsResponse, status_code=status.HTTP_201_CREATED, tags=["Rentals"])
async def create_rental(rent_data: RentalsCreate, db: Session = Depends(get_db)):
    """
    Create new item rent
    :param rent_data: Rent data
    :param db: Active database session
    :return: New Rental object
    """
    async with acquire_lock(f"inventory_lock:{rent_data.item_id}"):
        item = db.query(Inventory).filter(Inventory.id == rent_data.item_id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        if item.rental_status:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Item is already rented")

        rental = Rentals(**rent_data.model_dump())
        db.add(rental)
        db.flush()

        item.rental_status = True
        item.rental_id = rental.id

        db.commit()
        db.refresh(rental)
        return rental

@router.post("/db/rentals/{rental_id}/return", tags=["Rentals"])
async def return_rental(rental_id: int, db: Session = Depends(get_db)):
    """
    End item rental
    :param rental_id: Rental ID
    :param db: Active database session
    :return: Success message
    """
    rental = db.query(Rentals).filter(Rentals.id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")

    async with acquire_lock(f"inventory_lock:{rental.item_id}"):
        item = db.query(Inventory).filter(Inventory.id == rental.item_id).first()
        rental.end_date = date.today()
        if item:
            item.rental_status = False
            item.rental_id = None
        db.commit()
    return {"message": "Returned successfully"}

@router.get("/db/rentals/", response_model=List[RentalsResponse], tags=["Rentals"])
def get_rentals(db: Session = Depends(get_db)):
    """
    Get all rentals
    :param db: Active database session
    :return: List of all rentals
    """
    return db.query(Rentals).all()

@router.get("/db/rentals/{rental_id}", response_model=RentalsResponse, tags=["Rentals"])
def get_rental_by_id(rental_id: int, db: Session = Depends(get_db)):
    """
    Get specific rental by ID
    :param rental_id: Rental ID
    :param db: Active database session
    :return: Rental object
    """
    rental = db.query(Rentals).filter(Rentals.id == rental_id).first()
    if not rental:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    return rental


# ==========================================
# ROOMS
# ==========================================

@router.post("/db/rooms/", response_model=RoomsResponse, status_code=status.HTTP_201_CREATED, tags=["Rooms"])
def create_room(room_data: RoomsCreate, db: Session = Depends(get_db)):
    """
    Create new room
    :param room_data: Room data
    :param db: Active database session
    :return: Room object
    """
    obj = Rooms(**room_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/db/rooms/", response_model=List[RoomsResponse], tags=["Rooms"])
def get_rooms(db: Session = Depends(get_db)):
    """
    Fetch all rooms
    :param db: Active database session
    :return: List of all rooms
    """
    return db.query(Rooms).all()

@router.get("/db/rooms/{room_id}", response_model=RoomsResponse, tags=["Rooms"])
def get_room_by_id(room_id: int, db: Session = Depends(get_db)):
    """
    Fetch specific room by ID
    :param room_id: Room ID
    :param db: Active database session
    :return: Room object
    """
    room = db.query(Rooms).filter(Rooms.id == room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return room

@router.put("/db/rooms/{room_id}", response_model=RoomsResponse, tags=["Rooms"])
async def update_room(room_id: int, room_data: RoomsUpdate, db: Session = Depends(get_db)):
    """
    Update room
    :param room_id: Room ID
    :param room_data: Room data schema
    :param db: Active database session
    :return: Updated Room
    """
    async with acquire_lock(f"room_lock:{room_id}"):
        room = db.query(Rooms).filter(Rooms.id == room_id).first()
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
        for k, v in room_data.model_dump(exclude_unset=True).items():
            setattr(room, k, v)
        db.commit()
        db.refresh(room)
        return room

@router.delete("/db/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Rooms"])
async def delete_room(room_id: int, db: Session = Depends(get_db)):
    """
    Delete Room
    :param room_id: Room ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"room_lock:{room_id}"):
        room = db.query(Rooms).filter(Rooms.id == room_id).first()
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
        db.delete(room)
        db.commit()


# ==========================================
# CATEGORIES
# ==========================================

@router.post("/db/categories/", response_model=CategoriesResponse, status_code=status.HTTP_201_CREATED, tags=["Categories"])
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

@router.get("/db/categories/", response_model=List[CategoriesResponse], tags=["Categories"])
def get_categories(db: Session = Depends(get_db)):
    """
    Fetch all categories
    :param db: Active database session
    :return: List of all categories
    """
    return db.query(Categories).all()

@router.get("/db/categories/{cat_id}", response_model=CategoriesResponse, tags=["Categories"])
def get_category_by_id(cat_id: int, db: Session = Depends(get_db)):
    """
    Fetch specific category by ID
    :param cat_id: Category ID
    :param db: Active database session
    :return: Category object
    """
    cat = db.query(Categories).filter(Categories.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return cat

@router.put("/db/categories/{cat_id}", response_model=CategoriesResponse, tags=["Categories"])
async def update_category(cat_id: int, cat_data: CategoriesUpdate, db: Session = Depends(get_db)):
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
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        for k, v in cat_data.model_dump(exclude_unset=True).items():
            setattr(cat, k, v)
        db.commit()
        db.refresh(cat)
        return cat

@router.delete("/db/categories/{cat_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Categories"])
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
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        db.delete(cat)
        db.commit()


# ==========================================
# TEAMS
# ==========================================

@router.post("/db/teams/", response_model=TeamsResponse, status_code=status.HTTP_201_CREATED, tags=["Teams"])
def create_team(team_data: TeamsCreate, db: Session = Depends(get_db)):
    """
    Create new team
    :param team_data: Team data
    :param db: Active database session
    :return: Team object
    """
    obj = Teams(**team_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/db/teams/", response_model=List[TeamsResponse], tags=["Teams"])
def get_teams(db: Session = Depends(get_db)):
    """
    Fetch all teams
    :param db: Active database session
    :return: List of all teams
    """
    return db.query(Teams).all()

@router.get("/db/teams/{team_id}", response_model=TeamsResponse, tags=["Teams"])
def get_team_by_id(team_id: int, db: Session = Depends(get_db)):
    """
    Fetch specific team by ID
    :param team_id: Team ID
    :param db: Active database session
    :return: Team object
    """
    team = db.query(Teams).filter(Teams.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team

@router.put("/db/teams/{team_id}", response_model=TeamsResponse, tags=["Teams"])
async def update_team(team_id: int, team_data: TeamsUpdate, db: Session = Depends(get_db)):
    """
    Update Team
    :param team_id: Team ID
    :param team_data: Team data schema
    :param db: Active database session
    :return: Updated Team
    """
    async with acquire_lock(f"team_lock:{team_id}"):
        team = db.query(Teams).filter(Teams.id == team_id).first()
        if not team:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
        for k, v in team_data.model_dump(exclude_unset=True).items():
            setattr(team, k, v)
        db.commit()
        db.refresh(team)
        return team

@router.delete("/db/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Teams"])
async def delete_team(team_id: int, db: Session = Depends(get_db)):
    """
    Delete Team
    :param team_id: Team ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"team_lock:{team_id}"):
        team = db.query(Teams).filter(Teams.id == team_id).first()
        if not team:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
        db.delete(team)
        db.commit()


# ==========================================
# METADATA
# ==========================================

@router.post("/db/metadata/", response_model=MetadataResponse, status_code=status.HTTP_201_CREATED, tags=["Metadata"])
def create_metadata(meta_data: MetadataCreate, db: Session = Depends(get_db)):
    """
    Create new metadata
    :param meta_data: Metadata data
    :param db: Active database session
    :return: Metadata object
    """
    obj = Metadata(**meta_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/db/metadata/", response_model=List[MetadataResponse], tags=["Metadata"])
def get_all_metadata(db: Session = Depends(get_db)):
    """
    Fetch all metadata records
    :param db: Active database session
    :return: List of Metadata
    """
    return db.query(Metadata).all()

@router.get("/db/metadata/{meta_id}", response_model=MetadataResponse, tags=["Metadata"])
def get_metadata(meta_id: int, db: Session = Depends(get_db)):
    """
    Fetch metadata by ID
    :param meta_id: Metadata ID
    :param db: Active database session
    :return: Metadata object
    """
    obj = db.query(Metadata).filter(Metadata.id == meta_id).first()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metadata not found")
    return obj

@router.put("/db/metadata/{meta_id}", response_model=MetadataResponse, tags=["Metadata"])
async def update_metadata(meta_id: int, data: MetadataUpdate, db: Session = Depends(get_db)):
    """
    Update Metadata
    :param meta_id: Metadata ID
    :param data: Metadata data schema
    :param db: Active database session
    :return: Updated Metadata
    """
    async with acquire_lock(f"meta_lock:{meta_id}"):
        obj = db.query(Metadata).filter(Metadata.id == meta_id).first()
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metadata not found")
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

@router.delete("/db/metadata/{meta_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Metadata"])
async def delete_metadata(meta_id: int, db: Session = Depends(get_db)):
    """
    Delete Metadata
    :param meta_id: Metadata ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"meta_lock:{meta_id}"):
        obj = db.query(Metadata).filter(Metadata.id == meta_id).first()
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metadata not found")
        db.delete(obj)
        db.commit()


# ==========================================
# LAYOUT & LAYOUTS
# ==========================================

@router.post("/db/layout/", response_model=LayoutResponse, status_code=status.HTTP_201_CREATED, tags=["Layout"])
def create_layout_coord(data: LayoutCreate, db: Session = Depends(get_db)):
    """
    Create layout coordinate
    :param data: Layout data
    :param db: Active database session
    :return: Layout object
    """
    obj = Layout(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/db/layout/", response_model=List[LayoutResponse], tags=["Layout"])
def get_all_layout_coords(db: Session = Depends(get_db)):
    """
    Fetch all layout coordinates
    :param db: Active database session
    :return: List of Layout
    """
    return db.query(Layout).all()

@router.get("/db/layout/{layout_id}", response_model=LayoutResponse, tags=["Layout"])
def get_layout_coord_by_id(layout_id: int, db: Session = Depends(get_db)):
    """
    Fetch specific layout coordinate by ID
    :param layout_id: Layout ID
    :param db: Active database session
    :return: Layout object
    """
    obj = db.query(Layout).filter(Layout.id == layout_id).first()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Layout not found")
    return obj

@router.put("/db/layout/{layout_id}", response_model=LayoutResponse, tags=["Layout"])
async def update_layout_coord(layout_id: int, data: LayoutUpdate, db: Session = Depends(get_db)):
    """
    Update layout coordinate
    :param layout_id: Layout ID
    :param data: Layout data
    :param db: Active database session
    :return: Updated Layout
    """
    async with acquire_lock(f"layout_lock:{layout_id}"):
        obj = db.query(Layout).filter(Layout.id == layout_id).first()
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Layout not found")
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

@router.delete("/db/layout/{layout_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Layout"])
async def delete_layout_coord(layout_id: int, db: Session = Depends(get_db)):
    """
    Delete layout coordinate
    :param layout_id: Layout ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"layout_lock:{layout_id}"):
        obj = db.query(Layout).filter(Layout.id == layout_id).first()
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Layout not found")
        db.delete(obj)
        db.commit()


@router.post("/db/layouts/", response_model=LayoutsResponse, status_code=status.HTTP_201_CREATED, tags=["Layouts"])
def create_layout_assign(data: LayoutsCreate, db: Session = Depends(get_db)):
    """
    Create layout assignment
    :param data: Layouts data
    :param db: Active database session
    :return: Layouts assignment
    """
    obj = Layouts(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/db/layouts/", response_model=List[LayoutsResponse], tags=["Layouts"])
def get_all_layouts(db: Session = Depends(get_db)):
    """
    Fetch all layout assignments
    :param db: Active database session
    :return: List of Layouts
    """
    return db.query(Layouts).all()

@router.get("/db/layouts/{layouts_id}", response_model=LayoutsResponse, tags=["Layouts"])
def get_layouts_assign_by_id(layouts_id: int, db: Session = Depends(get_db)):
    """
    Fetch specific layout assignment by ID
    :param layouts_id: Layouts ID
    :param db: Active database session
    :return: Layouts object
    """
    obj = db.query(Layouts).filter(Layouts.id == layouts_id).first()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Layouts assignment not found")
    return obj

@router.put("/db/layouts/{layouts_id}", response_model=LayoutsResponse, tags=["Layouts"])
async def update_layout_assign(layouts_id: int, data: LayoutsUpdate, db: Session = Depends(get_db)):
    """
    Update layout assignment
    :param layouts_id: Layouts ID
    :param data: Layouts data schema
    :param db: Active database session
    :return: Updated Layouts
    """
    async with acquire_lock(f"layouts_lock:{layouts_id}"):
        obj = db.query(Layouts).filter(Layouts.id == layouts_id).first()
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Layouts assignment not found")
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

@router.delete("/db/layouts/{layouts_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Layouts"])
async def delete_layout_assign(layouts_id: int, db: Session = Depends(get_db)):
    """
    Delete layout assignment
    :param layouts_id: Layouts ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"layouts_lock:{layouts_id}"):
        obj = db.query(Layouts).filter(Layouts.id == layouts_id).first()
        if not obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Layouts assignment not found")
        db.delete(obj)
        db.commit()