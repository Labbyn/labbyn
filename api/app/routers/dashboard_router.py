from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.db.schemas import DashboardResponse
from app.utils.dashboard_service import build_dashboard
from app.auth.dependencies import RequestContext

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    tags=["Dashboard"],
)
def get_dashboard(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    return build_dashboard(db)
