"""Database models for the application using SQLAlchemy ORM."""

from datetime import datetime
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
from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTable
from fastapi_users_db_sqlalchemy.access_token import SQLAlchemyBaseAccessTokenTable

Base = declarative_base()


# pylint: disable=too-many-ancestors
# pylint: disable=too-few-public-methods


class UserType(str, PyEnum):
    """User types in the system."""

    ADMIN = "admin"
    GROUP_ADMIN = "group_admin"
    USER = "user"


class EntityType(PyEnum):
    """Entity types for history tracking."""

    MACHINES = "machines"
    INVENTORY = "inventory"
    ROOM = "room"
    USER = "user"
    CATEGORIES = "categories"


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

    version_id = Column(Integer, nullable=False, default=1)

    __mapper_args__ = {"version_id_col": version_id}

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
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    version_id = Column(Integer, nullable=False, default=1)

    __mapper_args__ = {"version_id_col": version_id}

    layouts = relationship("Layouts", back_populates="room")
    machines = relationship("Machines", back_populates="room")
    inventory = relationship("Inventory", back_populates="room")
    team = relationship("Teams", back_populates="rooms")


class Machines(Base):
    """
    Machines model representing machines in the system.
    """

    __tablename__ = "machines"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    localization_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    mac_address = Column(String(17), nullable=True)
    ip_address = Column(String(15), nullable=True)
    pdu_port = Column(Integer, nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    os = Column(String(30), nullable=True)
    serial_number = Column(String(50), nullable=True)
    note = Column(String(500), nullable=True)
    added_on = Column(DateTime, nullable=False, default=datetime.now)
    cpu = Column(String(100), nullable=True)
    ram = Column(String(100), nullable=True)
    disk = Column(String(100), nullable=True)
    metadata_id = Column(Integer, ForeignKey("metadata.id"), nullable=False)
    layout_id = Column(Integer, ForeignKey("layout.id"), nullable=True)

    version_id = Column(Integer, nullable=False, default=1)

    __mapper_args__ = {"version_id_col": version_id}

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

    version_id = Column(Integer, nullable=False, default=1)

    __mapper_args__ = {"version_id_col": version_id}

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

    version_id = Column(Integer, nullable=False, default=1)

    __mapper_args__ = {"version_id_col": version_id}

    machines = relationship("Machines", back_populates="team")
    rooms = relationship("Rooms", back_populates="team")
    inventory = relationship("Inventory", back_populates="team")
    users = relationship("User", back_populates="teams", foreign_keys="[User.team_id]")


class User(SQLAlchemyBaseUserTable[int], Base):
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
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # FastAPI Users fields
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    user_type = Column(
        Enum(UserType, name="user_type_enum", create_type=True),
        nullable=False,
        default=UserType.USER,
    )
    force_password_change = Column(Boolean, nullable=False, default=False)
    __table_args__ = {"schema": None}

    version_id = Column(Integer, nullable=False, default=1)

    __mapper_args__ = {"version_id_col": version_id}

    teams = relationship("Teams", back_populates="users", foreign_keys="[User.team_id]")

    rentals = relationship("Rentals", back_populates="user")
    history = relationship("History", back_populates="user")


class AccessToken(SQLAlchemyBaseAccessTokenTable[int], Base):
    """
    AccessToken model for FastAPI Users access tokens.
    """

    __tablename__ = "access_tokens"
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)


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

    version_id = Column(Integer, nullable=False, default=1)

    __mapper_args__ = {"version_id_col": version_id}

    user = relationship("User", back_populates="rentals")

    inventory = relationship(
        "Inventory", foreign_keys=[item_id], back_populates="rental_history"
    )


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

    version_id = Column(Integer, nullable=False, default=1)

    __mapper_args__ = {"version_id_col": version_id}

    room = relationship("Rooms", back_populates="inventory")
    machine = relationship("Machines", back_populates="inventory")
    team = relationship("Teams", back_populates="inventory")
    current_rental = relationship("Rentals", foreign_keys=[rental_id])

    rental_history = relationship(
        "Rentals", foreign_keys="[Rentals.item_id]", back_populates="inventory"
    )

    category = relationship("Categories", back_populates="inventory")


class Categories(Base):
    """
    Categories model representing inventory categories.
    """

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)

    version_id = Column(Integer, nullable=False, default=1)

    __mapper_args__ = {"version_id_col": version_id}

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
        DateTime(timezone=True),
        server_default=func.now(),  # pylint: disable=not-callable
    )
    before_state = Column(JSONB)
    after_state = Column(JSONB)
    can_rollback = Column(Boolean, default=True)
    extra_data = Column(JSONB)

    user = relationship("User", back_populates="history")

class Tags(Base):
    """
    Tags model representing tags in the system.
    """

    __tablename__ = "tags"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)
    color = Column(String(50), nullable=False)
    version_id = Column(Integer, nullable=False, default=1)

    __mapper_args__ = {"version_id_col": version_id}

    documentation = relationship("Documentation", secondary="tags_documentation")
class Documentation(Base):
    """
    Documentation model representing documentation in the system.
    """

    __tablename__ = "documentation"

    id = Column(Integer, primary_key=True)
    title = Column(String(50), nullable=False, unique=True)
    added_on = Column(DateTime, nullable=False, default=datetime.now)
    modified_on = Column(DateTime, nullable=True)
    version_id = Column(Integer, nullable=False, default=1)

    __mapper_args__ = {"version_id_col": version_id}

    tags = relationship("Tags", secondary="tags_documentation")
    
class TagsDocumentation(Base):
    """
    TagsDocumentation model representing association between documentation and tags.
    """
    __tablename__ = "tags_documentation"

    id = Column(Integer, primary_key=True)
    documentation_id = Column(Integer, ForeignKey("documentation.id"))
    tag_id = Column(Integer, ForeignKey("tags.id"))
