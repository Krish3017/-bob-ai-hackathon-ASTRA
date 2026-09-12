import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from app.core.database import port_repo
from app.core.auth import get_current_user, require_role
from app.models.schemas import BerthCreate, BerthUpdate, BerthResponse, UserResponse

router = APIRouter(prefix="/api/berths", tags=["Berths"])


@router.get("", response_model=List[BerthResponse])
def get_all_berths(current_user: UserResponse = Depends(get_current_user)):
    """List all berths and availability status"""
    berths = list(port_repo.berths.values())
    berths.sort(key=lambda b: b.get("berth_code", ""))
    return [BerthResponse(**b) for b in berths]


@router.get("/{berth_id}", response_model=BerthResponse)
def get_berth(
    berth_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Retrieve single berth details"""
    if berth_id not in port_repo.berths:
        raise HTTPException(status_code=404, detail="Berth not found")
    return BerthResponse(**port_repo.berths[berth_id])


@router.post("", response_model=BerthResponse, status_code=status.HTTP_201_CREATED)
def create_berth(
    payload: BerthCreate,
    current_user: UserResponse = Depends(require_role(["admin", "operations"]))
):
    """Add new berth (Operations & Admin)"""
    new_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    berth_data = payload.model_dump()
    berth_data.update({
        "id": new_id,
        "created_at": now,
        "updated_at": now
    })
    port_repo.berths[new_id] = berth_data
    return BerthResponse(**berth_data)


@router.put("/{berth_id}", response_model=BerthResponse)
def update_berth(
    berth_id: str,
    payload: BerthUpdate,
    current_user: UserResponse = Depends(require_role(["admin", "operations"]))
):
    """Update berth status (Available, Occupied, Maintenance) or vessel assignment"""
    if berth_id not in port_repo.berths:
        raise HTTPException(status_code=404, detail="Berth not found")

    berth = port_repo.berths[berth_id]
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    berth.update(update_data)
    port_repo.berths[berth_id] = berth
    return BerthResponse(**berth)


@router.delete("/{berth_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_berth(
    berth_id: str,
    current_user: UserResponse = Depends(require_role(["admin"]))
):
    """Delete a berth (Admin only)"""
    if berth_id not in port_repo.berths:
        raise HTTPException(status_code=404, detail="Berth not found")
    del port_repo.berths[berth_id]
    return None
