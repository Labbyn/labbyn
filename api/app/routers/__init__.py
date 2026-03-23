from .prometheus_router import router as prometheus
from .database_category_router import router as category
from .database_inventory_router import router as inventory
from .database_maps_router import router as maps
from .database_machine_router import router as machine
from .database_metadata_router import router as metadata
from .database_rental_router import router as rental
from .database_room_router import router as room
from .database_team_router import router as team
from .database_user_router import router as user
from .database_history_router import router as history
from .ansible_router import router as ansible
from .dashboard_router import router as dashboard
from .authentication_router import router as auth
from .database_documentation_router import router as documentation
from .database_tags_router import router as tags
from .subpage_history_router import router as history_sub
from .database_rack_router import router as rack
from .database_shelf_router import router as shelf
from .database_cpus_router import router as cpus
from .database_disks_router import router as disks
from .database_search_router import router as search

__all__ = [
    "prometheus",
    "category",
    "inventory",
    "maps",
    "machine",
    "metadata",
    "rental",
    "room",
    "team",
    "user",
    "history",
    "ansible",
    "dashboard",
    "auth",
    "documentation",
    "tags",
    "history_sub",
    "rack",
    "shelf",
    "cpus",
    "disks",
    "search",
]
