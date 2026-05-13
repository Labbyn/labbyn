from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict, List

from app.auth import dependencies
from .repository import DashboardRepository


class DashboardService:
    """User dashboard items parser.

    Prepares data structure with information for the user-dashboard page.
    """

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init Dashboard Service.

        Args:
            db (AsyncSession): Active database session.
            ctx (RequestContext): User request context containing user and team information.
        """
        self.db = db
        self.ctx = ctx
        self.repo = DashboardRepository()

    async def build_dashboard(self):
        """Build user dashboard.

        :return: User dashboard items structured in sections.
        """
        self.ctx.require_user()

        data = await self.repo.get_dashboard_data(self.db, self.ctx)

        machine_lookup = {m.id: m.name for m in data["machines"]}
        room_lookup = {r.id: r.name for r in data["rooms"]}
        inventory_lookup = {i.id: i.name for i in data["inventories"]}
        team_lookup = {t.id: t.name for t in data["teams"]}
        user_lookup = {u.id: f"{u.name} {u.surname}" for u in data["users"]}

        entity_name_maps = {
            "machines": machine_lookup,
            "inventory": inventory_lookup,
            "room": room_lookup,
            "teams": team_lookup,
            "user": user_lookup,
            "categories": {},
        }

        machine_items = [
            {
                "type": "Server",
                "id": m.name,
                "location": f"/machines/{m.id}",
                "tags": [
                    f"Team: {m.team.name if m.team else 'N/A'}",
                ],
            }
            for m in data["machines"]
        ]

        room_items = [
            {
                "type": "Room",
                "id": r.name,
                "location": f"/labs/{r.id}",
                "tags": (
                    [
                        f"Room type: {r.room_type}",
                        f"Team: {r.team.name if r.team else 'N/A'}",
                    ]
                    if r.room_type
                    else []
                ),
            }
            for r in data["rooms"]
        ]

        inventory_items = [
            {
                "type": "Inventory",
                "id": i.name,
                "location": f"/inventory/{i.id}",
                "tags": (
                    [
                        f"Category: {i.category.name if i.category else 'N/A'}",
                        f"Quantity: {i.quantity}",
                    ]
                    if i.quantity is not None
                    else []
                ),
            }
            for i in data["inventories"]
        ]

        team_items = [
            {
                "type": "Team",
                "id": t.name,
                "location": f"/teams/{t.id}",
                "tags": [f"Team Name: {t.name}"],
            }
            for t in data["teams"]
        ]

        history_items = []
        for h in data["histories"]:
            e_type_str = (
                h.entity_type.value
                if hasattr(h.entity_type, "value")
                else str(h.entity_type)
            )
            action_str = (
                h.action.value.upper()
                if hasattr(h.action, "value")
                else str(h.action).upper()
            )

            target_map = entity_name_maps.get(e_type_str, {})
            target_name = target_map.get(h.entity_id)

            if not target_name and h.before_state:
                target_name = h.before_state.get("login")

            if not target_name:
                target_name = f"ID: {h.entity_id}"

            display_type = e_type_str.upper()

            history_items.append(
                {
                    "type": "History",
                    "id": f"{action_str} {display_type} - {target_name}",
                    "location": f"/history/{h.id}",
                    "tags": [
                        f"By: {h.user.login if h.user else 'System'}",
                        f"Date: {h.timestamp.strftime('%Y-%m-%d %H:%M')}",
                    ],
                }
            )
        return {
            "sections": [
                {"name": "Machines", "items": machine_items},
                {"name": "Rooms", "items": room_items},
                {"name": "Inventory", "items": inventory_items},
                {"name": "Teams", "items": team_items},
                {"name": "History", "items": history_items},
            ]
        }
