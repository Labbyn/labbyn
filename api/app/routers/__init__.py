# api/app/routers/__init__.py

from .ansible.router import router as ansible
from .authentication.router import router as auth
from .category.router import router as category
from .cpu.router import router as cpus
from .dashboard.router import router as dashboard
from .disk.router import router as disks
from .documentation.router import router as documentation
from .history.router import router as history
from .history.sub_router import router as history_sub
from .inventory.router import router as inventory
from .machine.router import router as machine
from .map.router import router as maps
from .metadata.router import router as metadata
from .prometheus.router import router as prometheus
from .rack.router import router as rack
from .rental.router import router as rental
from .room.router import router as room
from .search.router import router as search
from .shelf.router import router as shelf
from .tags.router import router as tags
from .team.router import router as team
from .user.router import router as user

# Eksportujemy też prometheus_router dla workera w lifespan
prometheus_router = prometheus

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
    "history_sub",
    "ansible",
    "dashboard",
    "auth",
    "documentation",
    "tags",
    "rack",
    "shelf",
    "cpus",
    "disks",
    "search",
    "prometheus_router",
]
