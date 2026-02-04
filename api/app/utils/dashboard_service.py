"""
User dashboard items parser. Prepares json file with database data for user-dashboard page.
"""

from sqlalchemy.orm import Session
from app.db.models import Machines, Rooms, Inventory, Teams, User, History

# TO DO: add proper tags and handling
# pass only data accessable by user


def build_dashboard(db: Session):
    machines = db.query(Machines).all()
    rooms = db.query(Rooms).all()
    inventories = db.query(Inventory).all()
    teams = db.query(Teams).all()
    users = db.query(User).all()
    histories = db.query(History).all()

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
            "location": f"/rooms/{room.id}",
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

    user_items = [
        {
            "type": "User",
            "id": user.name,
            "location": f"/users/{user.id}",
            "tags": (
                [f"Team ID: {user.team_id}", f"User type: {user.user_type}"]
                if user.team_id is not None
                else []
            ),
        }
        for user in users
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
                "name": "Users",
                "items": user_items,
            },
            {
                "name": "History",
                "items": history_items,
            },
        ]
    }
