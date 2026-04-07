import io
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse

from app.auth import dependencies
from app.database import get_async_db
from .service import ExportService

router = APIRouter(prefix="/db/export", tags=["Export"])


@router.get("/all/bulk")
async def export_bulk_data(
    db=Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    service = ExportService(db, ctx)
    bundle = await service.export_bulk()

    filename = f"labbyn_bulk_{datetime.now().strftime('%Y%m%d_%H%M')}.json"

    return JSONResponse(
        content=bundle,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{entity_type}")
async def export_data(
    entity_type: str,
    format: str = Query("json", regex="^(json|csv)$"),
    db=Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    service = ExportService(db, ctx)
    now = datetime.now()
    timestamp = now.strftime("%Y%m%d_%H%M")

    try:
        content = await service.export_data(entity_type, format)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    filename = f"labbyn_{entity_type}_{timestamp}.{format}"

    if format == "csv":
        file_out = io.BytesIO(content.encode("utf-8"))
        return StreamingResponse(
            file_out,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    json_bundle = {
        "metadata": {
            "system": "labbyn",
            "entity": entity_type,
            "exported_at": now.isoformat(),
            "exported_by": ctx.user.login,
        },
        "data": content,
    }

    return JSONResponse(
        content=json_bundle,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
