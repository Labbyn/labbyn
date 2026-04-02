"""Pydantic machine models for database schemas."""

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas import cpu_schemas, disk_schemas, tag_schemas


class MachinesBase(BaseModel):
    """Base model for Machines."""

    name: str = Field(..., max_length=100, description="Unique machine name/hostname")
    localization_id: int = Field(
        ..., description="ID of the room where machine is located"
    )
    mac_address: Optional[str] = Field(None, max_length=17, description="MAC Address")
    ip_address: Optional[str] = Field(None, max_length=15, description="IP Address")
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
    cpus: Optional[List[cpu_schemas.CPUBase]] = Field(
        default=[], description="CPU specification"
    )
    ram: Optional[str] = Field(None, max_length=100, description="RAM specification")
    disks: Optional[List[disk_schemas.DisksBase]] = Field(
        default=[], description="Disk/Storage specification"
    )
    metadata_id: Optional[int] = Field(
        ..., description="ID of associated metadata record"
    )
    shelf_id: Optional[int] = Field(
        None, description="ID of shelf coordinates if applicable"
    )


class MachinesCreate(MachinesBase):
    """Schema for creating a Machine."""

    added_on: datetime = Field(
        default_factory=datetime.now,
        description="Date when machine was added. Defaults to now.",
    )


class MachinesUpdate(BaseModel):
    """Schema for updating a Machine."""

    name: Optional[str] = Field(None, max_length=100)
    room_id: Optional[int] = None
    ip_address: Optional[str] = Field(None, max_length=16)
    mac_address: Optional[str] = Field(None, max_length=17)
    pdu_port: Optional[int] = None
    team_id: Optional[int] = None
    os: Optional[str] = Field(None, max_length=30)
    serial_number: Optional[str] = Field(None, max_length=50)
    note: Optional[str] = Field(None, max_length=500)
    cpus: Optional[List[cpu_schemas.CPUBase]] = Field(
        default=[], description="CPU specification"
    )
    ram: Optional[str] = Field(None, max_length=100)
    disks: Optional[List[disk_schemas.DisksBase]] = Field(
        default=[], description="Disk/Storage specification"
    )
    shelf_id: Optional[int] = None
    metadata_id: Optional[int] = None


class MachinesResponse(MachinesBase):
    """Schema for reading Machine data."""

    id: int
    added_on: datetime
    version_id: int
    model_config = ConfigDict(from_attributes=True)
    cpus: List[cpu_schemas.CPUResponse]
    disks: List[disk_schemas.DiskResponse]


class MachineInRackResponse(BaseModel):
    """Schema for reading Machine data within a Rack context.

    Includes shelf information.
    """

    name: str
    ip_address: Optional[str]
    mac_address: Optional[str]
    team_id: Optional[int]
    machine_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class MachineFullDetailResponse(BaseModel):
    """Complete machine detail schema.

    Combining database records with live Prometheus metrics
    """

    id: int
    name: str
    ip_address: Optional[str]
    mac_address: Optional[str]
    os: Optional[str]
    cpus: List[cpu_schemas.CPUResponse] = []
    ram_info: Optional[str] = Field(None, alias="ram")
    disks: List[disk_schemas.DiskResponse] = []
    serial_number: Optional[str]
    note: Optional[str]
    pdu_port: Optional[int]
    added_on: datetime

    team_id: Optional[int]
    team_name: str
    rack_id: Optional[int]
    rack_name: Optional[str]
    room_name: str
    room_id: int
    shelf_number: int
    shelf_id: int

    last_update: Optional[date]
    monitoring: bool
    ansible_access: bool
    ansible_root_access: Optional[bool]

    tags: List[tag_schemas.TagsResponse]
    network_status: str = "Unknown"
    prometheus_live_stats: Dict[str, Any] = {
        "cpu_usage": None,
        "ram_usage": None,
        "disks": [],
    }

    # TODO: nav links (grafana, map - not implemented)
    grafana_link: str
    rack_link: str
    map_link: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
