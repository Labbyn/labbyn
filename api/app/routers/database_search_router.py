from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from app.database import get_db
from app.db import schemas
from app.auth.dependencies import RequestContext

router = APIRouter(tags=["Search"])

@router.get("/command_search", response_model=List[schemas.GlobalSearchResponse])
async def get_search_data(
    ctx: RequestContext = Depends(),
    db: Session = Depends(get_db)
):

    ctx.require_user()

    params = {
        "is_admin": ctx.is_admin,
        "team_ids": tuple(ctx.team_ids) if ctx.team_ids else (None,)
    }

    sql_query = text("""
        WITH raw_data AS (
            SELECT 'user_' || id AS row_id, id AS object_id, 'user' AS type, name || ' ' || surname AS label, email AS sublabel, '/users/profile/' || id AS target_url, NULL::int AS team_id FROM "user"
            UNION ALL
            SELECT 'machine_' || id, id, 'machine', name, 'IP: ' || COALESCE(ip_address, '-') || ' | SN: ' || COALESCE(serial_number, '-'), '/infrastructure/machines/' || id, team_id FROM machines
            UNION ALL
            SELECT 'rack_' || id, id, 'rack', name, NULL, '/infrastructure/racks/' || id, team_id FROM racks
            UNION ALL
            SELECT 'team_' || id, id, 'team', name, NULL, '/settings/teams/' || id, id FROM teams
            UNION ALL
            SELECT 'inv_' || id, id, 'inventory', name, NULL, '/inventory/items/' || id, team_id FROM inventory
            UNION ALL
            SELECT 'doc_' || id, id, 'documentation', title, 'Autor: ' || author, '/documentation/' || id, NULL::int FROM documentation
            UNION ALL
            SELECT 'room_' || id, id, 'room', name, NULL, '/infrastructure/rooms/' || id, team_id FROM rooms
        )
        SELECT * FROM raw_data
        WHERE :is_admin = TRUE 
           OR team_id IS NULL 
           OR team_id IN :team_ids
    """)

    result = db.execute(sql_query, params).mappings().all()

    return result