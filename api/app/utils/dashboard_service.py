"""
User dashboard items parser. Prepares json file with database data for user-dashboard page.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Machines, Rooms, Inventory, Teams, History
from app.auth.dependencies import RequestContext


async def build_dashboard(db: AsyncSession, ctx: RequestContext):
    ctx.require_user()

    machines_stmt = ctx.team_filter(select(Machines), Machines)
    rooms_stmt = ctx.team_filter(select(Rooms), Rooms)
    inventory_stmt = ctx.team_filter(select(Inventory), Inventory)
    teams_stmt = ctx.team_filter(select(Teams), Teams)
    history_stmt = ctx.team_filter(select(History), History)

    machines = (await db.execute(machines_stmt)).scalars().all()
    rooms = (await db.execute(rooms_stmt)).scalars().all()
    inventories = (await db.execute(inventory_stmt)).scalars().all()
    teams = (await db.execute(teams_stmt)).scalars().all()
    histories = (await db.execute(history_stmt)).scalars().all()

    machine_items = [
        {
            "type": "Server",
            "id": machine.name,
            "location": f"/machines/{machine.id}",
            "tags": (
                [f"Team ID: {str(machine.team_id)}"]
                if machine.team_id is not None
                else []
            ),
        }
        for machine in machines
    ]

    room_items = [
        {
            "type": "Room",
            "id": room.name,
            "location": f"/labs/{room.id}",
            "tags": (
                [f"Room type: {room.room_type}"] if room.room_type is not None else []
            ),
        }
        for room in rooms
    ]

    inventory_items = [
        {
            "type": "Inventory",
            "id": inventory.name,
            "location": f"/inventory/{inventory.id}",
            "tags": (
                [
                    f"Category: {inventory.category_id}",
                    f"Quantity: {inventory.quantity}",
                ]
                if inventory.category_id is not None and inventory.quantity is not None
                else []
            ),
        }
        for inventory in inventories
    ]

    team_items = [
        {
            "type": "Team",
            "id": team.name,
            "location": f"/teams/{team.id}",
            "tags": [f"Team ID: {team.id}"] if team.id is not None else [],
        }
        for team in teams
    ]

    history_items = [
        {
            "type": "History",
            "id": history.action,
            "location": f"/history/{history.id}",
            "tags": (
                [
                    f"Entity type: {history.entity_type}",
                    f"Can rollback: {history.can_rollback}",
                ]
                if history.entity_type is not None
                else []
            ),
        }
        for history in histories
    ]

    return {
        "sections": [
            {
                "name": "Machines",
                "items": machine_items,
            },
            {
                "name": "Rooms",
                "items": room_items,
            },
            {
                "name": "Inventory",
                "items": inventory_items,
            },
            {
                "name": "Teams",
                "items": team_items,
            },
            {
                "name": "History",
                "items": history_items,
            },
        ]
    }
