"""Pydantic user models for database schemas."""

from email.policy import default
from typing import List, Optional, Union

from fastapi_users import schemas
from pydantic import BaseModel, ConfigDict, EmailStr, Field

import app.schemas.base_schemas as base_schemas
from app.db.models import UserType


class UserTeamMemebership(BaseModel):
    """Schema representing a user's membership in a team.

    Use for displaying team info in user details.
    """

    team_id: int
    team_name: str
    is_group_admin: bool = False

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    """Base model for Users containing shared public attributes.

    NOTE: Does NOT contain password.
    """

    name: str = Field(..., max_length=50, description="User's first name")
    surname: str = Field(..., max_length=80, description="User's last name")
    login: str = Field(..., max_length=30, description="Unique login username")
    email: Optional[EmailStr] = Field(None, description="User's email address")
    user_type: base_schemas.UserTypeEnum = Field(
        ..., max_length=50, description="User's role in the system"
    )


class UserCreate(UserBase):
    """Schema for creating a new User.

    REQUIRES a password field.
    """

    password: Optional[str] = Field(
        default=None,
        max_length=255,
        description="If not provided, a random one will be generated",
    )
    team_ids: Optional[List[int]] = Field(
        default=[], description="List of team IDs to assign the user to upon creation"
    )
    team_id: Optional[Union[int, str]] = None


class UserUpdate(BaseModel):
    """Schema for updating a User.

    Allows updating profile info or password separately.
    """

    name: Optional[str] = Field(None, max_length=50)
    surname: Optional[str] = Field(None, max_length=80)
    email: Optional[EmailStr] = None
    login: Optional[str] = Field(None, max_length=30)
    password: Optional[str] = Field(
        None,
        min_length=6,
        max_length=255,
        description="New password if change is requested",
    )
    team_ids: Optional[List[int]] = None
    user_type: base_schemas.UserTypeEnum = Field(
        None, max_length=50, description="User's role in the system"
    )


class UserResponse(UserBase):
    """Schema for reading User data.

    EXCLUDES the password for security reasons.
    """

    id: int
    version_id: int
    membership: List[UserTeamMemebership] = Field(
        default=[], description="User's memberships"
    )
    model_config = ConfigDict(from_attributes=True)


class UserCreatedResponse(UserResponse):
    """Schema for reading User data upon creation.

    INCLUDES the generated password.
    """

    model_config = ConfigDict(from_attributes=True)
    generated_password: Optional[str] = Field(
        None, description="Generated password if one was created"
    )


class UserGroupInfo(BaseModel):
    """Model representing a simplified group/team information.

    Used to provide group names in user-related responses.
    """

    name: str = Field(..., description="Name of the team/group")


class UserInfo(BaseModel):
    """Basic user information for display purposes.

    Includes identity, role and assigned groups.
    """

    id: int
    name: str = Field(..., description="User's first name")
    surname: str = Field(..., description="User's last name")
    login: str = Field(..., description="Unique login username")
    user_type: UserType = Field(..., description="User's role and permissions level")
    membership: List[UserTeamMemebership] = Field(
        default=[], description="Detailed team memberships"
    )
    force_password_change: Optional[bool] = None
    avatar_url: Optional[str] = None
    email: Optional[str] = None


class UserInfoExtended(UserInfo):
    """Extended user profile information for detailed views.

    Includes avatar, contact details and group links.
    """

    avatar_url: Optional[str] = None
    email: EmailStr
    group_links: List[str] = Field(
        default=[], description="Links to the assigned groups details"
    )
    force_password_change: Optional[bool] = None


class UserTeamRoleUpdate(BaseModel):
    """Update schema for modifying a user's role within a specific team."""

    team_id: int
    is_group_admin: bool


class UserShortResponse(BaseModel):
    """Short schema for User data (e.g., in lists or logs).

    Only login is needed for audit logs.
    """

    login: str
    model_config = ConfigDict(from_attributes=True)


class FirstChangePasswordRequest(BaseModel):
    """Schema for the first-time password setup."""

    new_password: str = Field(..., min_length=6, max_length=255)


# Schemas needed by Fast Api
class FastApiUserRead(schemas.BaseUser[int]):
    """Schema for reading user data.

    Inherits from fastapi-users BaseUser schema.
    """

    name: str
    surname: str
    login: str
    team_ids: Optional[List[int]] = Field(default=[], description="Team IDs")
    user_type: base_schemas.UserTypeEnum
    force_password_change: bool
    version_id: int

    model_config = ConfigDict(from_attributes=True)


class FastApiUserCreate(schemas.BaseUserCreate):
    """Schema for creating a new user.

    Inherits from fastapi-users BaseUserCreate schema.
    """

    name: str = Field(..., max_length=50)
    surname: str = Field(..., max_length=80)
    login: str = Field(..., max_length=30)
    user_type: base_schemas.UserTypeEnum = base_schemas.UserTypeEnum.USER
    password: Optional[str] = None
    team_ids: Optional[List[int]] = Field(default=[], description="Team IDs")


class FastApiUserUpdate(schemas.BaseUserUpdate):
    """Schema for updating user data.

    Inherits from fastapi-users BaseUserUpdate schema.
    """

    name: Optional[str] = None
    surname: Optional[str] = None
    team_ids: Optional[List[int]] = Field(default=[], description="Team IDs")
    login: Optional[str] = None
