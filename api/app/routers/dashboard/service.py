from sqlalchemy.ext.asyncio import AsyncSession
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

        machine_items = [
            {
                "type": "Server",
                "id": m.name,
                "location": f"/machines/{m.id}",
                "tags": [f"Team ID: {str(m.team_id)}"] if m.team_id is not None else [],
            }
            for m in data["machines"]
        ]

        room_items = [
            {
                "type": "Room",
                "id": r.name,
                "location": f"/labs/{r.id}",
                "tags": [f"Room type: {r.room_type}"] if r.room_type is not None else [],
            }
            for r in data["rooms"]
        ]

        inventory_items = [
            {
                "type": "Inventory",
                "id": i.name,
                "location": f"/inventory/{i.id}",
                "tags": [f"Category: {i.category_id}", f"Quantity: {i.quantity}"]
                if i.category_id is not None and i.quantity is not None else [],
            }
            for i in data["inventories"]
        ]

        team_items = [
            {
                "type": "Team",
                "id": t.name,
                "location": f"/teams/{t.id}",
                "tags": [f"Team ID: {t.id}"] if t.id is not None else [],
            }
            for t in data["teams"]
        ]

        history_items = [
            {
                "type": "History",
                "id": h.action,
                "location": f"/history/{h.id}",
                "tags": [f"Entity type: {h.entity_type}", f"Can rollback: {h.can_rollback}"]
                if h.entity_type is not None else [],
            }
            for h in data["histories"]
        ]

        return {
            "sections": [
                {"name": "Machines", "items": machine_items},
                {"name": "Rooms", "items": room_items},
                {"name": "Inventory", "items": inventory_items},
                {"name": "Teams", "items": team_items},
                {"name": "History", "items": history_items},
            ]
        }