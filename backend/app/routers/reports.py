from datetime import datetime
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()

# In-memory store (swap for a database later)
_reports: list = []


class ReportIn(BaseModel):
    issue_type: str = Field(..., max_length=100)
    severity: str = Field(..., max_length=20)
    description: str = Field("", max_length=500)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    provider: str = Field("unknown", max_length=20)
    confidence: Optional[float] = None


@router.post("/report")
async def submit_report(report: ReportIn):
    entry = {
        "id": f"RPT-{int(datetime.utcnow().timestamp())}",
        **report.dict(),
        "submitted_at": datetime.utcnow().isoformat(),
        "status": "received",
    }
    _reports.append(entry)
    return {
        "ok": True,
        "report_id": entry["id"],
        "message": "Report submitted with GPS coordinates",
    }


@router.get("/report")
async def list_reports():
    return {"count": len(_reports), "reports": _reports[-50:]}