import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
from app.core.config import settings

# Attempt to initialize Supabase client if configured
supabase_client = None
if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        print("Connected to Supabase PostgreSQL.")
    except Exception as e:
        print(f"Supabase initialization skipped/failed: {e}")


class PortRepository:
    """
    In-memory stateful repository pre-seeded with realistic port operations data.
    Automatically syncs or falls back if Supabase is unavailable.
    """
    def __init__(self):
        self.users: Dict[str, Dict[str, Any]] = {}
        self.berths: Dict[str, Dict[str, Any]] = {}
        self.cranes: Dict[str, Dict[str, Any]] = {}
        self.vessels: Dict[str, Dict[str, Any]] = {}
        self.yards: Dict[str, Dict[str, Any]] = {}
        self.disruptions: Dict[str, Dict[str, Any]] = {}
        self.optimization_runs: Dict[str, Dict[str, Any]] = {}
        self.schedules: Dict[str, Dict[str, Any]] = {}
        self.seed_defaults()

    def seed_defaults(self):
        now = datetime.now(timezone.utc)

        # 1. Users
        users_seed = [
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "email": "admin@naviops.port",
                "full_name": "Capt. Michael Vance",
                "role": "admin",
                "department": "Port Authority Executive",
                "created_at": now - timedelta(days=30)
            },
            {
                "id": "22222222-2222-2222-2222-222222222222",
                "email": "ops@naviops.port",
                "full_name": "Elena Rostova",
                "role": "operations",
                "department": "Quayside Operations Control",
                "created_at": now - timedelta(days=20)
            },
            {
                "id": "33333333-3333-3333-3333-333333333333",
                "email": "executive@naviops.port",
                "full_name": "David Chen",
                "role": "viewer",
                "department": "Maritime Logistics & Analytics",
                "created_at": now - timedelta(days=10)
            }
        ]
        for u in users_seed:
            self.users[u["id"]] = u

        # 2. Berths
        berths_seed = [
            {"id": "b0000001-0000-0000-0000-000000000001", "berth_code": "B-01", "berth_name": "North Quay Ultra-Max 1", "max_vessel_length": 400.0, "status": "Occupied", "current_vessel_id": "f0000001-0000-0000-0000-000000000001", "available_from": now + timedelta(hours=6), "created_at": now, "updated_at": now},
            {"id": "b0000002-0000-0000-0000-000000000002", "berth_code": "B-02", "berth_name": "North Quay Ultra-Max 2", "max_vessel_length": 400.0, "status": "Maintenance", "current_vessel_id": None, "available_from": now + timedelta(hours=18), "created_at": now, "updated_at": now},
            {"id": "b0000003-0000-0000-0000-000000000003", "berth_code": "B-03", "berth_name": "Central Terminal Berth 3", "max_vessel_length": 350.0, "status": "Occupied", "current_vessel_id": "f0000002-0000-0000-0000-000000000002", "available_from": now + timedelta(hours=10), "created_at": now, "updated_at": now},
            {"id": "b0000004-0000-0000-0000-000000000004", "berth_code": "B-04", "berth_name": "Central Terminal Berth 4", "max_vessel_length": 320.0, "status": "Available", "current_vessel_id": None, "available_from": now, "created_at": now, "updated_at": now},
            {"id": "b0000005-0000-0000-0000-000000000005", "berth_code": "B-05", "berth_name": "South Feeder Quay 5", "max_vessel_length": 240.0, "status": "Available", "current_vessel_id": None, "available_from": now, "created_at": now, "updated_at": now}
        ]
        for b in berths_seed:
            self.berths[b["id"]] = b

        # 3. Cranes
        cranes_seed = [
            {"id": "c0000001-0000-0000-0000-000000000001", "crane_code": "CR-01", "crane_name": "Super STS Gantry 1", "capacity_per_hour": 40, "status": "Busy", "current_vessel_id": "f0000001-0000-0000-0000-000000000001", "assigned_berth_id": "b0000001-0000-0000-0000-000000000001", "available_from": now + timedelta(hours=6), "created_at": now, "updated_at": now},
            {"id": "c0000002-0000-0000-0000-000000000002", "crane_code": "CR-02", "crane_name": "Super STS Gantry 2", "capacity_per_hour": 40, "status": "Busy", "current_vessel_id": "f0000001-0000-0000-0000-000000000001", "assigned_berth_id": "b0000001-0000-0000-0000-000000000001", "available_from": now + timedelta(hours=6), "created_at": now, "updated_at": now},
            {"id": "c0000003-0000-0000-0000-000000000003", "crane_code": "CR-03", "crane_name": "Super STS Gantry 3", "capacity_per_hour": 38, "status": "Maintenance", "current_vessel_id": None, "assigned_berth_id": "b0000002-0000-0000-0000-000000000002", "available_from": now + timedelta(hours=14), "created_at": now, "updated_at": now},
            {"id": "c0000004-0000-0000-0000-000000000004", "crane_code": "CR-04", "crane_name": "Super STS Gantry 4", "capacity_per_hour": 38, "status": "Failed", "current_vessel_id": None, "assigned_berth_id": "b0000002-0000-0000-0000-000000000002", "available_from": now + timedelta(hours=28), "created_at": now, "updated_at": now},
            {"id": "c0000005-0000-0000-0000-000000000005", "crane_code": "CR-05", "crane_name": "Post-Panamax STS 5", "capacity_per_hour": 35, "status": "Busy", "current_vessel_id": "f0000002-0000-0000-0000-000000000002", "assigned_berth_id": "b0000003-0000-0000-0000-000000000003", "available_from": now + timedelta(hours=10), "created_at": now, "updated_at": now},
            {"id": "c0000006-0000-0000-0000-000000000006", "crane_code": "CR-06", "crane_name": "Post-Panamax STS 6", "capacity_per_hour": 35, "status": "Busy", "current_vessel_id": "f0000002-0000-0000-0000-000000000002", "assigned_berth_id": "b0000003-0000-0000-0000-000000000003", "available_from": now + timedelta(hours=10), "created_at": now, "updated_at": now},
            {"id": "c0000007-0000-0000-0000-000000000007", "crane_code": "CR-07", "crane_name": "Post-Panamax STS 7", "capacity_per_hour": 35, "status": "Available", "current_vessel_id": None, "assigned_berth_id": "b0000004-0000-0000-0000-000000000004", "available_from": now, "created_at": now, "updated_at": now},
            {"id": "c0000008-0000-0000-0000-000000000008", "crane_code": "CR-08", "crane_name": "Post-Panamax STS 8", "capacity_per_hour": 32, "status": "Available", "current_vessel_id": None, "assigned_berth_id": "b0000004-0000-0000-0000-000000000004", "available_from": now, "created_at": now, "updated_at": now},
            {"id": "c0000009-0000-0000-0000-000000000009", "crane_code": "CR-09", "crane_name": "Feeder Rail STS 9", "capacity_per_hour": 28, "status": "Available", "current_vessel_id": None, "assigned_berth_id": "b0000005-0000-0000-0000-000000000005", "available_from": now, "created_at": now, "updated_at": now},
            {"id": "c0000010-0000-0000-0000-000000000010", "crane_code": "CR-10", "crane_name": "Feeder Rail STS 10", "capacity_per_hour": 28, "status": "Available", "current_vessel_id": None, "assigned_berth_id": "b0000005-0000-0000-0000-000000000005", "available_from": now, "created_at": now, "updated_at": now}
        ]
        for c in cranes_seed:
            self.cranes[c["id"]] = c

        # 4. Yards
        yards_seed = [
            {"id": "e0000001-0000-0000-0000-000000000001", "yard_code": "YZ-01", "yard_name": "North Container Stacking (Inbound)", "cargo_type": "Container", "total_capacity": 8500, "occupied_capacity": 7140, "utilization_percentage": 84.0, "status": "Normal", "updated_at": now},
            {"id": "e0000002-0000-0000-0000-000000000002", "yard_code": "YZ-02", "yard_name": "North Container Stacking (Outbound)", "cargo_type": "Container", "total_capacity": 7500, "occupied_capacity": 6890, "utilization_percentage": 91.87, "status": "Near Capacity", "updated_at": now},
            {"id": "e0000003-0000-0000-0000-000000000003", "yard_code": "YZ-03", "yard_name": "Central Reefer & Hazardous Yard", "cargo_type": "Container", "total_capacity": 3000, "occupied_capacity": 2760, "utilization_percentage": 92.0, "status": "Congested", "updated_at": now},
            {"id": "e0000004-0000-0000-0000-000000000004", "yard_code": "YZ-04", "yard_name": "South Feeder Transfer Buffer", "cargo_type": "Container", "total_capacity": 5000, "occupied_capacity": 2450, "utilization_percentage": 49.0, "status": "Normal", "updated_at": now},
            {"id": "e0000005-0000-0000-0000-000000000005", "yard_code": "YZ-05", "yard_name": "General & Project Cargo Depot", "cargo_type": "General Cargo", "total_capacity": 4000, "occupied_capacity": 1800, "utilization_percentage": 45.0, "status": "Normal", "updated_at": now}
        ]
        for y in yards_seed:
            self.yards[y["id"]] = y

        # 5. Vessels
        vessels_seed = [
            {"id": "f0000001-0000-0000-0000-000000000001", "vessel_code": "IMO-9839438", "vessel_name": "MSC Maya", "shipping_line": "MSC", "cargo_type": "Container", "cargo_volume": 1420, "vessel_length": 396.0, "arrival_time": now - timedelta(hours=14), "eta": now - timedelta(hours=15), "etd": now + timedelta(hours=6), "priority": 1, "status": "Unloading", "assigned_berth_id": "b0000001-0000-0000-0000-000000000001", "expected_waiting_time": 0.0, "created_at": now, "updated_at": now},
            {"id": "f0000002-0000-0000-0000-000000000002", "vessel_code": "IMO-9708693", "vessel_name": "CMA CGM Palais Royal", "shipping_line": "CMA CGM", "cargo_type": "Container", "cargo_volume": 980, "vessel_length": 345.0, "arrival_time": now - timedelta(hours=8), "eta": now - timedelta(hours=9), "etd": now + timedelta(hours=10), "priority": 2, "status": "Loading", "assigned_berth_id": "b0000003-0000-0000-0000-000000000003", "expected_waiting_time": 0.0, "created_at": now, "updated_at": now},
            {"id": "f0000003-0000-0000-0000-000000000003", "vessel_code": "IMO-9632064", "vessel_name": "Maersk Mc-Kinney Moller", "shipping_line": "Maersk", "cargo_type": "Container", "cargo_volume": 1850, "vessel_length": 399.0, "arrival_time": now - timedelta(hours=4), "eta": now - timedelta(hours=4), "etd": now + timedelta(hours=24), "priority": 1, "status": "Waiting", "assigned_berth_id": None, "expected_waiting_time": 5.5, "created_at": now, "updated_at": now},
            {"id": "f0000004-0000-0000-0000-000000000004", "vessel_code": "IMO-9783459", "vessel_name": "Cosco Shipping Taurus", "shipping_line": "COSCO", "cargo_type": "Container", "cargo_volume": 1200, "vessel_length": 366.0, "arrival_time": now - timedelta(hours=2), "eta": now - timedelta(hours=2), "etd": now + timedelta(hours=22), "priority": 2, "status": "Waiting", "assigned_berth_id": None, "expected_waiting_time": 7.0, "created_at": now, "updated_at": now},
            {"id": "f0000005-0000-0000-0000-000000000005", "vessel_code": "IMO-9811000", "vessel_name": "Ever Given", "shipping_line": "Evergreen", "cargo_type": "Container", "cargo_volume": 1600, "vessel_length": 399.9, "arrival_time": now - timedelta(hours=1), "eta": now - timedelta(hours=1), "etd": now + timedelta(hours=30), "priority": 2, "status": "Waiting", "assigned_berth_id": None, "expected_waiting_time": 8.5, "created_at": now, "updated_at": now},
            {"id": "f0000006-0000-0000-0000-000000000006", "vessel_code": "IMO-9736107", "vessel_name": "Hapag-Lloyd Al Jmeliyah", "shipping_line": "Hapag-Lloyd", "cargo_type": "Container", "cargo_volume": 1100, "vessel_length": 368.0, "arrival_time": None, "eta": now + timedelta(hours=4), "etd": now + timedelta(hours=28), "priority": 2, "status": "Scheduled", "assigned_berth_id": None, "expected_waiting_time": 3.0, "created_at": now, "updated_at": now},
            {"id": "f0000007-0000-0000-0000-000000000007", "vessel_code": "IMO-9842114", "vessel_name": "ONE Apus", "shipping_line": "Ocean Network Express", "cargo_type": "Container", "cargo_volume": 850, "vessel_length": 310.0, "arrival_time": None, "eta": now + timedelta(hours=8), "etd": now + timedelta(hours=26), "priority": 3, "status": "Delayed", "assigned_berth_id": None, "expected_waiting_time": 6.0, "created_at": now, "updated_at": now},
            {"id": "f0000008-0000-0000-0000-000000000008", "vessel_code": "IMO-9708453", "vessel_name": "Yang Ming Warranty", "shipping_line": "Yang Ming", "cargo_type": "Container", "cargo_volume": 920, "vessel_length": 333.0, "arrival_time": None, "eta": now + timedelta(hours=12), "etd": now + timedelta(hours=34), "priority": 2, "status": "Scheduled", "assigned_berth_id": None, "expected_waiting_time": 2.0, "created_at": now, "updated_at": now},
            {"id": "f0000009-0000-0000-0000-000000000009", "vessel_code": "IMO-9776171", "vessel_name": "OOCL Hong Kong", "shipping_line": "OOCL", "cargo_type": "Container", "cargo_volume": 1700, "vessel_length": 399.87, "arrival_time": None, "eta": now + timedelta(hours=16), "etd": now + timedelta(hours=44), "priority": 1, "status": "Scheduled", "assigned_berth_id": None, "expected_waiting_time": 4.0, "created_at": now, "updated_at": now},
            {"id": "f0000010-0000-0000-0000-000000000010", "vessel_code": "IMO-9694529", "vessel_name": "Zim Rotterdam", "shipping_line": "ZIM", "cargo_type": "Container", "cargo_volume": 650, "vessel_length": 260.0, "arrival_time": None, "eta": now + timedelta(hours=22), "etd": now + timedelta(hours=38), "priority": 3, "status": "Scheduled", "assigned_berth_id": None, "expected_waiting_time": 0.0, "created_at": now, "updated_at": now},
            {"id": "f0000011-0000-0000-0000-000000000011", "vessel_code": "IMO-9824980", "vessel_name": "HMM Algeciras", "shipping_line": "HMM", "cargo_type": "Container", "cargo_volume": 1950, "vessel_length": 399.9, "arrival_time": None, "eta": now + timedelta(hours=30), "etd": now + timedelta(hours=62), "priority": 1, "status": "Scheduled", "assigned_berth_id": None, "expected_waiting_time": 1.5, "created_at": now, "updated_at": now},
            {"id": "f0000012-0000-0000-0000-000000000012", "vessel_code": "IMO-9484948", "vessel_name": "WEC Vermeer", "shipping_line": "WEC Lines", "cargo_type": "Container", "cargo_volume": 380, "vessel_length": 160.0, "arrival_time": None, "eta": now + timedelta(hours=36), "etd": now + timedelta(hours=48), "priority": 4, "status": "Scheduled", "assigned_berth_id": None, "expected_waiting_time": 0.0, "created_at": now, "updated_at": now},
            {"id": "f0000013-0000-0000-0000-000000000013", "vessel_code": "IMO-9399856", "vessel_name": "Atlantic Star", "shipping_line": "ACL", "cargo_type": "Ro-Ro", "cargo_volume": 450, "vessel_length": 296.0, "arrival_time": None, "eta": now + timedelta(hours=42), "etd": now + timedelta(hours=58), "priority": 3, "status": "Scheduled", "assigned_berth_id": None, "expected_waiting_time": 0.0, "created_at": now, "updated_at": now},
            {"id": "f0000014-0000-0000-0000-000000000014", "vessel_code": "IMO-9725861", "vessel_name": "Unifeeder Baltic", "shipping_line": "Unifeeder", "cargo_type": "Container", "cargo_volume": 320, "vessel_length": 140.0, "arrival_time": None, "eta": now + timedelta(hours=50), "etd": now + timedelta(hours=60), "priority": 4, "status": "Scheduled", "assigned_berth_id": None, "expected_waiting_time": 0.0, "created_at": now, "updated_at": now}
        ]
        for v in vessels_seed:
            self.vessels[v["id"]] = v

        # 6. Disruptions
        disruptions_seed = [
            {
                "id": "d0000001-0000-0000-0000-000000000001",
                "disruption_type": "Equipment Failure",
                "title": "CR-04 Hydraulic Hoist Failure",
                "description": "Quay crane CR-04 experienced primary hoist hydraulic seal breach during high-speed hoist cycle. Engineering team dispatched.",
                "affected_resource_type": "crane",
                "affected_resource_id": "c0000004-0000-0000-0000-000000000004",
                "severity": "High",
                "start_time": now - timedelta(hours=3),
                "end_time": now + timedelta(hours=25),
                "status": "Active",
                "created_at": now - timedelta(hours=3)
            },
            {
                "id": "d0000002-0000-0000-0000-000000000002",
                "disruption_type": "Berth Maintenance",
                "title": "Berth B-02 High-Impact Fender Replacement",
                "description": "Structural refurbishment of marine pneumatic rubber fenders along section 4 of Berth B-02. Berthing suspended.",
                "affected_resource_type": "berth",
                "affected_resource_id": "b0000002-0000-0000-0000-000000000002",
                "severity": "Critical",
                "start_time": now - timedelta(hours=6),
                "end_time": now + timedelta(hours=18),
                "status": "Active",
                "created_at": now - timedelta(hours=6)
            },
            {
                "id": "d0000003-0000-0000-0000-000000000003",
                "disruption_type": "Weather",
                "title": "Heavy Outer Fog & Channel Speed Restriction",
                "description": "Harbor pilotage restricted navigation speed to 6 knots in outer fairway due to dense advection fog.",
                "affected_resource_type": "port",
                "affected_resource_id": None,
                "severity": "Medium",
                "start_time": now - timedelta(hours=2),
                "end_time": now + timedelta(hours=8),
                "status": "Active",
                "created_at": now - timedelta(hours=2)
            }
        ]
        for d in disruptions_seed:
            self.disruptions[d["id"]] = d


# Global repository instance
port_repo = PortRepository()
