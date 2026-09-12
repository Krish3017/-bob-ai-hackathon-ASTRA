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


from app.core.auth import create_access_token


def test_missing_auth_returns_401():
    # Calling protected endpoint without Authorization header must return 401
    res = client.get("/api/dashboard/summary")
    assert res.status_code == 401
    assert "Missing Authorization header" in res.json()["detail"]


def test_invalid_jwt_returns_401():
    # Calling protected endpoint with invalid JWT must return 401
    res = client.get("/api/dashboard/summary", headers={"Authorization": "Bearer invalid.token.signature"})
    assert res.status_code == 401


def test_dashboard_summary_endpoint():
    admin_token = create_access_token({"sub": "11111111-1111-1111-1111-111111111111", "email": "admin@naviops.port", "role": "admin"})
    res = client.get("/api/dashboard/summary", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "congestion" in data
    assert "metrics" in data
    assert data["total_berths"] == 5
    assert data["total_cranes"] == 10


def test_rbac_restrictions():
    admin_token = create_access_token({"sub": "11111111-1111-1111-1111-111111111111", "email": "admin@naviops.port", "role": "admin"})
    ops_token = create_access_token({"sub": "22222222-2222-2222-2222-222222222222", "email": "ops@naviops.port", "role": "operations"})
    viewer_token = create_access_token({"sub": "33333333-3333-3333-3333-333333333333", "email": "executive@naviops.port", "role": "viewer"})

    # 1. Viewer cannot delete a vessel (403 Forbidden)
    res_delete = client.delete(
        "/api/vessels/f0000001-0000-0000-0000-000000000001",
        headers={"Authorization": f"Bearer {viewer_token}"}
    )
    assert res_delete.status_code == 403

    # 2. Operations staff can create a disruption (201 Created)
    res_disruption = client.post("/api/disruptions", json={
        "disruption_type": "Equipment Failure",
        "title": "Crane CR-07 Electrical Interlock Test",
        "affected_resource_type": "crane",
        "affected_resource_id": "c0000007-0000-0000-0000-000000000007",
        "severity": "Low"
    }, headers={"Authorization": f"Bearer {ops_token}"})
    assert res_disruption.status_code == 201

    # 3. Operations staff cannot apply schedule (Admin only -> 403 Forbidden)
    res_apply = client.post("/api/optimization/apply", json={"run_id": "fake"}, headers={"Authorization": f"Bearer {ops_token}"})
    assert res_apply.status_code == 403

    # 4. Admin can delete a vessel
    res_admin_delete = client.delete(
        "/api/vessels/f0000014-0000-0000-0000-000000000014",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin_delete.status_code == 204
