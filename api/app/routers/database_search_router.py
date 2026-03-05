"""Router for global search across multiple database tables"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.db.schemas import GroupSearchResponse
from app.db.models import Rack, Rooms, Teams, Machines, User, Inventory, Documentation
from app.auth.dependencies import RequestContext

router = APIRouter(tags=["Search"])


@router.get("/db/search", response_model=List[GroupedSearchResponse])
async def get_search_data(
    ctx: RequestContext = Depends(), db: Session = Depends(get_db)
):
    """
    Global search endpoint that aggregates data from multiple tables
    :param ctx: Request context containing user and team information
    :param db: Current database session
    :return: List of search results with type, label, sublabel, and target URL
    """

    ctx.require_user()

    res = {
        "machines": [],
        "users": [],
        "racks": [],
        "teams": [],
        "rooms": [],
        "inventory": [],
        "documentation": [],
    }

    users = db.query(User).all()
    for u in users:
        res["users"].append(
            {
                "id": u.id,
                "label": f"{u.name} {u.surname}",
                "sublabel": u.email,
                "target_url": f"/users/{u.id}",
            }
        )

    teams = db.query(Teams).all()
    for t in teams:
        res["teams"].append(
            {"id": t.id, "label": t.name, "target_url": f"/teams/{t.id}"}
        )

    docs = db.query(Documentation).all()
    for d in docs:
        res["documentation"].append(
            {
                "id": d.id,
                "label": d.title,
                "sublabel": f"Autor: {d.author}",
                "target_url": f"/documentation/{d.id}",
            }
        )

    machines = ctx.team_filter(db.query(Machines), Machines).all()
    for m in machines:
        res["machines"].append(
            {
                "id": m.id,
                "label": m.name,
                "sublabel": f"IP: {m.ip_address or '-'} | SN: {m.serial_number or '-'}",
                "target_url": f"/machines/{m.id}",
            }
        )

    racks = ctx.team_filter(db.query(Rack), Rack).all()
    for r in racks:
        res["racks"].append(
            {"id": r.id, "label": r.name, "target_url": f"/racks/{r.id}"}
        )

    items = ctx.team_filter(db.query(Inventory), Inventory).all()
    for i in items:
        res["inventory"].append(
            {"id": i.id, "label": i.name, "target_url": f"/inventory/{i.id}"}
        )

    rooms = ctx.team_filter(db.query(Rooms), Rooms).all()
    for rm in rooms:
        res["rooms"].append(
            {"id": rm.id, "label": rm.name, "target_url": f"/rooms/{rm.id}"}
        )

    return res
