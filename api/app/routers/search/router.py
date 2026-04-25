"""Router for global search across multiple database tables."""

from fastapi import APIRouter, Depends

from app.auth import dependencies
from app.schemas import search_schemas

from .service import SearchService

router = APIRouter(prefix="/db/search", tags=["Search"])


@router.get("", response_model=search_schemas.GroupedSearchResponse)
async def get_search_data(
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Global search endpoint that aggregates data from multiple tables.

    :param ctx: Request context containing user and team information
    :param db: Current database session
    :return: List of search results with type, label, sublabel, and target URL
    """
    return await SearchService(ctx.db, ctx).get_global_search_data()
