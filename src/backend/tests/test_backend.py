import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import port_repo
from app.congestion.calculator import calculate_port_congestion
from app.optimization.optimizer import PortOptimizer

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"


def test_congestion_calculator():
    congestion = calculate_port_congestion(
        vessels=list(port_repo.vessels.values()),
        berths=list(port_repo.berths.values()),
        cranes=list(port_repo.cranes.values()),
        yards=list(port_repo.yards.values()),
        disruptions=list(port_repo.disruptions.values())
    )
    assert 0 <= congestion.score <= 100
    assert congestion.level in ["Low", "Moderate", "High", "Critical"]
    assert len(congestion.factors) >= 5


def test_optimization_solver():
    optimizer = PortOptimizer(
        vessels=list(port_repo.vessels.values()),
        berths=list(port_repo.berths.values()),
        cranes=list(port_repo.cranes.values()),
        disruptions=list(port_repo.disruptions.values()),
        horizon_hours=72
    )
    res = optimizer.solve()
    assert res["status"] in ["OPTIMAL", "FEASIBLE"]
    assert len(res["schedules"]) > 0
    # Every scheduled item has valid berth and times
    for item in res["schedules"]:
        assert item.berth_id is not None
        assert item.planned_end > item.planned_start


def test_dashboard_summary_endpoint():
    res = client.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert "congestion" in data
    assert "metrics" in data
    assert data["total_berths"] == 5
    assert data["total_cranes"] == 10


def test_rbac_restrictions():
    # 1. Viewer cannot delete a vessel
    headers_viewer = {"Authorization": "Bearer executive@naviops.port"}
    res_delete = client.delete("/api/vessels/v0000001-0000-0000-0000-000000000001", headers=headers_viewer)
    assert res_delete.status_code == 403

    # 2. Operations staff can create a disruption
    headers_ops = {"Authorization": "Bearer ops@naviops.port"}
    res_disruption = client.post("/api/disruptions", json={
        "disruption_type": "Equipment Failure",
        "title": "Crane CR-07 Electrical Interlock Test",
        "affected_resource_type": "crane",
        "affected_resource_id": "c0000007-0000-0000-0000-000000000007",
        "severity": "Low"
    }, headers=headers_ops)
    assert res_disruption.status_code == 201

    # 3. Operations staff cannot apply schedule (Admin only)
    res_apply = client.post("/api/optimization/apply", json={"run_id": "fake"}, headers=headers_ops)
    assert res_apply.status_code == 403
