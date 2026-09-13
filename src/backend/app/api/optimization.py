from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict, Any
from app.core.database import port_repo
from app.core.auth import get_current_user, require_role
from app.optimization.optimizer import PortOptimizer
from app.models.schemas import OptimizationRunResponse, ScheduleItemResponse, ApplyScheduleRequest, UserResponse

router = APIRouter(prefix="/api/optimization", tags=["Optimization Engine"])


@router.post("/run", response_model=OptimizationRunResponse, status_code=status.HTTP_201_CREATED)
def trigger_optimization_run(
    current_user: UserResponse = Depends(require_role(["admin", "operations"]))
):
    """
    Execute Google OR-Tools CP-SAT optimization engine for next 72 hours.
    Calculates non-overlapping berth assignments, crane allocations, and minimizes delays.
    """
    optimizer = PortOptimizer(
        vessels=list(port_repo.vessels.values()),
        berths=list(port_repo.berths.values()),
        cranes=list(port_repo.cranes.values()),
        disruptions=list(port_repo.disruptions.values()),
        horizon_hours=72
    )

    run_result = optimizer.solve()
    run_id = run_result["id"]

    # Store in memory repository
    port_repo.optimization_runs[run_id] = run_result
    schedules_data = []
    for item in run_result["schedules"]:
        item_dict = item.model_dump()
        dict.__setitem__(port_repo.schedules, item.id, item_dict)
        schedules_data.append(item_dict)

    port_repo.persist_items_batch("schedules", schedules_data)

    return OptimizationRunResponse(**run_result)


@router.get("/runs", response_model=List[OptimizationRunResponse])
def list_optimization_runs(current_user: UserResponse = Depends(get_current_user)):
    """List historical optimization runs and objective metrics"""
    runs = list(port_repo.optimization_runs.values())
    runs.sort(key=lambda r: str(r.get("created_at", "")), reverse=True)
    return [OptimizationRunResponse(**r) for r in runs]


@router.get("/runs/latest", response_model=OptimizationRunResponse)
def get_latest_optimization_run(current_user: UserResponse = Depends(get_current_user)):
    """Retrieve the most recent optimization plan, or generate one if none exists"""
    if not port_repo.optimization_runs:
        # Run automatically on first request
        optimizer = PortOptimizer(
            vessels=list(port_repo.vessels.values()),
            berths=list(port_repo.berths.values()),
            cranes=list(port_repo.cranes.values()),
            disruptions=list(port_repo.disruptions.values()),
            horizon_hours=72
        )
        run_result = optimizer.solve()
        run_id = run_result["id"]
        port_repo.optimization_runs[run_id] = run_result
        schedules_data = []
        for item in run_result["schedules"]:
            item_dict = item.model_dump()
            dict.__setitem__(port_repo.schedules, item.id, item_dict)
            schedules_data.append(item_dict)
        port_repo.persist_items_batch("schedules", schedules_data)
        return OptimizationRunResponse(**run_result)

    runs = list(port_repo.optimization_runs.values())
    runs.sort(key=lambda r: str(r.get("created_at", "")), reverse=True)
    return OptimizationRunResponse(**runs[0])


@router.get("/runs/{run_id}", response_model=OptimizationRunResponse)
def get_optimization_run(
    run_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Retrieve specific optimization run details"""
    if run_id not in port_repo.optimization_runs:
        raise HTTPException(status_code=404, detail="Optimization run not found")
    return OptimizationRunResponse(**port_repo.optimization_runs[run_id])


@router.get("/schedule/{run_id}", response_model=List[ScheduleItemResponse])
def get_run_schedule(
    run_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Retrieve 72-hour schedule items for a given optimization run"""
    if run_id not in port_repo.optimization_runs:
        raise HTTPException(status_code=404, detail="Optimization run not found")
    return port_repo.optimization_runs[run_id]["schedules"]


@router.post("/apply", response_model=Dict[str, Any])
def apply_optimization_schedule(
    req: ApplyScheduleRequest,
    current_user: UserResponse = Depends(require_role(["admin"]))
):
    """
    Approve & Apply recommended 72-hour schedule (Port Manager / Admin only).
    Updates assigned berths on affected vessels and persists state.
    """
    if req.run_id not in port_repo.optimization_runs:
        raise HTTPException(status_code=404, detail="Optimization run not found")

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    run_record = dict(port_repo.optimization_runs[req.run_id])
    schedules = run_record.get("schedules", [])

    applied_count = 0
    for sched in schedules:
        v_id = sched.vessel_id if hasattr(sched, "vessel_id") else sched.get("vessel_id")
        b_id = sched.berth_id if hasattr(sched, "berth_id") else sched.get("berth_id")
        w_time = sched.waiting_time if hasattr(sched, "waiting_time") else sched.get("waiting_time", 0.0)

        if v_id and v_id in port_repo.vessels:
            vessel = dict(port_repo.vessels[v_id])
            vessel["assigned_berth_id"] = b_id
            vessel["expected_waiting_time"] = float(w_time)
            vessel["updated_at"] = now
            port_repo.vessels[v_id] = vessel
            applied_count += 1

    run_record["applied"] = True
    run_record["applied_by"] = current_user.id
    port_repo.optimization_runs[req.run_id] = run_record

    return {
        "status": "success",
        "message": f"Successfully applied schedule plan to {applied_count} vessels.",
        "run_id": req.run_id
    }
