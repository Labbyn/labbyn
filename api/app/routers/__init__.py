from .prometheus_router import router as prometheus
from api.app.routers.category.router import router as category
from api.app.routers.inventory.router import router as inventory
from .database_maps_router import router as maps
from api.app.routers.machine.router import router as machine
from .database_metadata_router import router as metadata
from .database_rental_router import router as rental
from .database_room_router import router as room
from .database_team_router import router as team
from .database_user_router import router as user
from api.app.routers.history.router import router as history
from api.app.routers.ansible.router import router as ansible
from api.app.routers.dashboard.router import router as dashboard
from api.app.routers.authentication.router import router as auth
from api.app.routers.documentation.router import router as documentation
from .database_tags_router import router as tags
from .subpage_history_router import router as history_sub
from .database_rack_router import router as rack
from .database_shelf_router import router as shelf
from api.app.routers.cpu.router import router as cpus
from api.app.routers.disk.router import router as disks
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
