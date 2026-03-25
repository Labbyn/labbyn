import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import dependencies
from .repository import SearchRepository


class SearchService:
    """Service for aggregating global search results."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init Search Service.

        :param db: Active database session.
        :param ctx: User context.
        """
        self.db = db
        self.ctx = ctx
        self.repo = SearchRepository()

    async def get_global_search_data(self):
        """Execute parallel queries and format results for global search.

        :return: Formatted dictionary of search results grouped by type.
        """
        self.ctx.require_user()
        stmts = self.repo.get_search_statements(self.ctx)

        keys = list(stmts.keys())
        results = await asyncio.gather(*(self.db.execute(stmts[k]) for k in keys))

        data = {keys[i]: results[i].scalars().all() for i in range(len(keys))}

        return {
            "users": [
                {
                    "id": u.id,
                    "label": f"{u.name} {u.surname}",
                    "sublabel": u.email,
                    "target_url": f"/users/{u.id}",
                }
                for u in data["users"]
            ],
            "teams": [
                {"id": t.id, "label": t.name, "target_url": f"/teams/{t.id}"}
                for t in data["teams"]
            ],
            "documentation": [
                {
                    "id": d.id,
                    "label": d.title,
                    "sublabel": f"Author: {d.author}",
                    "target_url": f"/documentation/{d.id}",
                }
                for d in data["docs"]
            ],
            "machines": [
                {
                    "id": m.id,
                    "label": m.name,
                    "sublabel": f"IP: {m.ip_address or '-'} | SN: {m.serial_number or '-'}",
                    "target_url": f"/machines/{m.id}",
                }
                for m in data["machines"]
            ],
            "racks": [
                {"id": r.id, "label": r.name, "target_url": f"/racks/{r.id}"}
                for r in data["racks"]
            ],
            "inventory": [
                {"id": i.id, "label": i.name, "target_url": f"/inventory/{i.id}"}
                for i in data["items"]
            ],
            "rooms": [
                {"id": rm.id, "label": rm.name, "target_url": f"/rooms/{rm.id}"}
                for rm in data["rooms"]
            ],
        }
