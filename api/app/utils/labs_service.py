"""
Lab items parser. Prepares json file with database data for lab page.
"""

from sqlalchemy.orm import Session, selectinload
from app.db.models import Rooms, Machines
from fastapi import HTTPException

def build_labs(db: Session, lab_id: int = None):
    query = (
        db.query(Rooms)
        .options(selectinload(Rooms.machines).selectinload(Machines.layout))
    )
    if lab_id:
        room = query.filter(Rooms.id == lab_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Lab not found")
        rooms = [room]
    else:
        rooms = query.all()

    room_items = []
    for room in rooms:
        racks_map = {}

        for machine in room.machines:
            l_id = machine.layout_id
            if l_id not in racks_map:
                racks_map[l_id] = {
                    "id": f"rack-{l_id}",
                    "tags": [],
                    "machines": [],
                }

            racks_map[l_id]["machines"].append(
                {
                    "device_id": str(machine.id),
                    "hostname": machine.name,
                    "ip_address": machine.ip_address,
                    "mac_address": machine.mac_address,
                }
            )
        # Ensure that empty racks are also included
        for layout in room.layouts:
            l_id = layout.id
            if l_id not in racks_map:
                racks_map[l_id] = {
                    "id": f"rack-{l_id}",
                    "tags": [],
                    "machines": [],
                }

        room_items.append(
            {
                "id": room.id,
                "name": room.name,
                "location": f"/labs/{room.id}",
                "racks": list(racks_map.values()),
            }
        )
    return room_items[0] if lab_id else room_items
