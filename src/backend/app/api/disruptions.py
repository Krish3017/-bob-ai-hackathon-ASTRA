import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from app.core.database import port_repo
from app.core.auth import get_current_user, require_role
from app.models.schemas import DisruptionCreate, DisruptionUpdate, DisruptionResponse, UserResponse

router = APIRouter(prefix="/api/disruptions", tags=["Disruptions"])


@router.get("", response_model=List[DisruptionResponse])
def get_all_disruptions(
    status: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """List operational disruptions and incident logs"""
    disruptions = list(port_repo.disruptions.values())
    if status:
        disruptions = [d for d in disruptions if d.get("status", "").lower() == status.lower()]
    disruptions.sort(key=lambda d: str(d.get("created_at", "")), reverse=True)
    return [DisruptionResponse(**d) for d in disruptions]


@router.post("", response_model=DisruptionResponse, status_code=status.HTTP_201_CREATED)
def create_disruption(
    payload: DisruptionCreate,
    current_user: UserResponse = Depends(require_role(["admin", "operations"]))
):
    """
    Log an active disruption / impediment (Operations & Admin).
    Automatically propagates affected status to the corresponding crane, berth, or yard.
    """
    new_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    data = payload.model_dump()
    data.update({
        "id": new_id,
        "start_time": data.get("start_time") or now,
        "created_at": now
    })
    port_repo.disruptions[new_id] = data

    # Automatic side effect propagation
    res_type = data.get("affected_resource_type")
    res_id = data.get("affected_resource_id")
    if res_id:
        if res_type == "crane" and res_id in port_repo.cranes:
            if "fail" in data.get("disruption_type", "").lower():
                port_repo.cranes[res_id]["status"] = "Failed"
            else:
                port_repo.cranes[res_id]["status"] = "Maintenance"
        elif res_type == "berth" and res_id in port_repo.berths:
            port_repo.berths[res_id]["status"] = "Maintenance"
        elif res_type == "vessel" and res_id in port_repo.vessels:
            port_repo.vessels[res_id]["status"] = "Delayed"

    return DisruptionResponse(**data)


@router.put("/{disruption_id}", response_model=DisruptionResponse)
def update_disruption(
    disruption_id: str,
    payload: DisruptionUpdate,
    current_user: UserResponse = Depends(require_role(["admin", "operations"]))
):
    """Update or resolve an operational incident (Operations & Admin)"""
    if disruption_id not in port_repo.disruptions:
        raise HTTPException(status_code=404, detail="Disruption incident not found")

    item = port_repo.disruptions[disruption_id]
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    item.update(update_data)

    # If resolved, restore affected resource if feasible
    if update_data.get("status") in ["Resolved", "Mitigated"]:
        res_type = item.get("affected_resource_type")
        res_id = item.get("affected_resource_id")
        if res_id:
            if res_type == "crane" and res_id in port_repo.cranes:
                port_repo.cranes[res_id]["status"] = "Available"
            elif res_type == "berth" and res_id in port_repo.berths:
                port_repo.berths[res_id]["status"] = "Available"

    port_repo.disruptions[disruption_id] = item
    return DisruptionResponse(**item)


@router.delete("/{disruption_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_disruption(
    disruption_id: str,
    current_user: UserResponse = Depends(require_role(["admin"]))
):
    """Delete disruption incident (Admin only)"""
    if disruption_id not in port_repo.disruptions:
        raise HTTPException(status_code=404, detail="Disruption incident not found")
    del port_repo.disruptions[disruption_id]
    return None
