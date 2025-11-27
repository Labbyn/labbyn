"""Database models for the application using SQLAlchemy ORM."""

from enum import Enum as PyEnum
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


# pylint: disable=too-many-ancestors
# pylint: disable=too-few-public-methods


class UserType(PyEnum):
    """User types in the system."""

    ADMIN = "admin"
    USER = "user"


class EntityType(PyEnum):
    """Entity types for history tracking."""

    MACHINE = "machine"
    INVETORY = "inventory"
    ROOM = "room"
    USER = "user"


class ActionType(PyEnum):
    """Action types for history tracking."""

    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


class Layout(Base):
    """
    Layout model representing the layout coordinates.
    """

    __tablename__ = "layout"

    id = Column(Integer, primary_key=True)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)

    rooms = relationship("Layouts", back_populates="layout")
    machines = relationship("Machines", back_populates="layout")


class Layouts(Base):
    """
    Layouts model representing the association between rooms and layouts.
    """

    __tablename__ = "layouts"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    layout_id = Column(Integer, ForeignKey("layout.id"), nullable=False)

    layout = relationship("Layout", back_populates="rooms")
    room = relationship("Rooms", back_populates="layouts")


class Rooms(Base):
    """
    Rooms model representing rooms in the system.
    """

    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    room_type = Column(String(100), nullable=True)

    layouts = relationship("Layouts", back_populates="room")
    machines = relationship("Machines", back_populates="room")
    inventory = relationship("Inventory", back_populates="room")


class Machines(Base):
    """
    Machines model representing machines in the system.
    """

    __tablename__ = "machines"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    localization_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    mac_address = Column(String(17), nullable=True)
    pdu_port = Column(Integer, nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    os = Column(String(30), nullable=True)
    serial_number = Column(String(50), nullable=True)
    note = Column(String(500), nullable=True)
    added_on = Column(DateTime, nullable=False)
    cpu = Column(String(100), nullable=True)
    ram = Column(String(100), nullable=True)
    disk = Column(String(100), nullable=True)
    metadata_id = Column(Integer, ForeignKey("metadata.id"), nullable=False)
    layout_id = Column(Integer, ForeignKey("layout.id"), nullable=True)

    room = relationship("Rooms", back_populates="machines")
    layout = relationship("Layout", back_populates="machines")
    team = relationship("Teams", back_populates="machines")
    machine_metadata = relationship("Metadata", back_populates="machines")
    inventory = relationship("Inventory", back_populates="machine")


class Metadata(Base):
    """
    Metadata model representing additional metadata for machines.
    """

    __tablename__ = "metadata"

    id = Column(Integer, primary_key=True)
    last_update = Column(Date, nullable=True)
    agent_prometheus = Column(Boolean, nullable=True, default=False)
    ansible_access = Column(Boolean, nullable=True, default=False)
    ansible_root_access = Column(Boolean, nullable=True, default=False)

    machines = relationship("Machines", back_populates="machine_metadata")


class Teams(Base):
    """
    Teams model representing teams in the system.
    """

    __tablename__ = "teams"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    team_admin_id = Column(
        Integer,
        ForeignKey("user.id", use_alter=True, name="fk_team_admin_id"),
        nullable=False,
    )

    machines = relationship("Machines", back_populates="teams")
    users = relationship("User", back_populates="teams")


class User(Base):
    """
    User model representing users in the system.
    """

    __tablename__ = "user"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    surname = Column(String(80), nullable=False)
    team_id = Column(
        Integer,
        ForeignKey("teams.id", use_alter=True, name="fk_user_team_id"),
        nullable=True,
    )
    login = Column(String(30), nullable=False, unique=True)
    password = Column(String(255), nullable=False)
    email = Column(String(100), nullable=True, unique=True)

    user_type = Column(
        Enum(UserType, name="user_type_enum", create_type=True),
        nullable=False,
        default=UserType.USER,
    )

    __table_args__ = {"schema": None}

    teams = relationship("Teams", back_populates="users")
    rentals = relationship("Rentals", back_populates="user")
    history = relationship("History", back_populates="user")


class Rentals(Base):
    """
    Rentals model representing machine rentals by users.
    """

    __tablename__ = "rentals"

    id = Column(Integer, primary_key=True)
    item_id = Column(
        Integer,
        ForeignKey("inventory.id", use_alter=True, name="fk_rentals_inventory_id"),
        nullable=False,
    )
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    __table_args__ = {"schema": None}

    user = relationship("User", back_populates="rentals")
    inventory = relationship("Inventory", back_populates="rental")


class Inventory(Base):
    """
    Inventory model representing inventory items in the system.
    """

    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    localization_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    rental_status = Column(Boolean, nullable=False, default=False)
    rental_id = Column(Integer, ForeignKey("rentals.id"), nullable=True)

    room = relationship("Rooms", back_populates="inventory")
    machine = relationship("Machines", back_populates="inventory")
    rental = relationship("Rentals", back_populates="inventory")


class Categories(Base):
    """
    Categories model representing inventory categories.
    """

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)

    inventory = relationship("Inventory", back_populates="category")


class History(Base):
    """
    History model representing actions performed in the system.
    """

    __tablename__ = "history"

    id = Column(Integer, primary_key=True)

    entity_type = Column(
        Enum(EntityType, name="entity_type_enum", create_type=True), nullable=False
    )

    action = Column(
        Enum(ActionType, name="action_type_enum", create_type=True), nullable=False
    )

    entity_id = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey("user.id"))
    timestamp = Column(
        DateTime(timezone=True), server_default=func.now()
    )  # pylint: disable=not-callable
    before_state = Column(JSONB)
    after_state = Column(JSONB)
    can_rollback = Column(Boolean, default=True)
    extra_data = Column(JSONB)

    user = relationship("User", back_populates="history")
