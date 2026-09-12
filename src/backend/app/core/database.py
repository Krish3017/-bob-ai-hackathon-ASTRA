import os
import uuid
import logging
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.core.config import settings

logger = logging.getLogger("naviops.database")

TABLE_COLUMNS = {
    "users": ["id", "email", "full_name", "role", "department", "created_at"],
    "berths": ["id", "berth_code", "berth_name", "max_vessel_length", "status", "current_vessel_id", "available_from", "created_at", "updated_at"],
    "cranes": ["id", "crane_code", "crane_name", "capacity_per_hour", "status", "current_vessel_id", "assigned_berth_id", "available_from", "created_at", "updated_at"],
    "yards": ["id", "yard_code", "yard_name", "cargo_type", "total_capacity", "occupied_capacity", "status", "updated_at"],
    "vessels": ["id", "vessel_code", "vessel_name", "shipping_line", "cargo_type", "cargo_volume", "vessel_length", "arrival_time", "eta", "etd", "priority", "status", "assigned_berth_id", "expected_waiting_time", "created_at", "updated_at"],
    "disruptions": ["id", "disruption_type", "title", "description", "affected_resource_type", "affected_resource_id", "severity", "start_time", "end_time", "status", "created_at"],
    "optimization_runs": ["id", "planning_horizon_start", "planning_horizon_end", "objective_value", "total_waiting_time", "total_delay", "status", "metrics_json", "applied", "applied_by", "created_at"],
    "schedules": ["id", "optimization_run_id", "vessel_id", "berth_id", "planned_start", "planned_end", "waiting_time", "assigned_cranes", "assignment_reason", "status", "created_at"],
}


def clean_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Convert PostgreSQL UUID and Decimal types into standard Python types for Pydantic."""
    cleaned = {}
    for k, v in row.items():
        if isinstance(v, uuid.UUID):
            cleaned[k] = str(v)
        elif isinstance(v, Decimal):
            cleaned[k] = float(v)
        else:
            cleaned[k] = v
    return cleaned


class SyncedTable(dict):
    """
    In-memory dictionary that automatically persists additions and updates
    to Supabase PostgreSQL in real time, with zero latency on reads.
    """
    def __init__(self, repo, table_name: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.repo = repo
        self.table_name = table_name

    def __setitem__(self, key, value):
        super().__setitem__(key, value)
        if hasattr(self, "repo") and self.repo.is_connected:
            self.repo.persist_item(self.table_name, value)

    def __delitem__(self, key):
        super().__delitem__(key)
        if hasattr(self, "repo") and self.repo.is_connected:
            self.repo.delete_item(self.table_name, key)


class PortRepository:
    """
    Stateful repository backed by Supabase PostgreSQL with in-memory caching.
    Ensures immediate sub-millisecond query responses and live database persistence.
    """
    def __init__(self):
        self.is_connected = False
        self.users = SyncedTable(self, "users")
        self.berths = SyncedTable(self, "berths")
        self.cranes = SyncedTable(self, "cranes")
        self.vessels = SyncedTable(self, "vessels")
        self.yards = SyncedTable(self, "yards")
        self.disruptions = SyncedTable(self, "disruptions")
        self.optimization_runs = SyncedTable(self, "optimization_runs")
        self.schedules = SyncedTable(self, "schedules")

        # 1. Seed fallback in-memory defaults
        self.seed_defaults()

        # 2. Sync from live Supabase PostgreSQL
        self.connect_and_sync()

    def get_connection(self):
        """Create a direct connection to PostgreSQL with dict_row factory."""
        url = settings.clean_database_url
        if not url:
            return None
        return psycopg.connect(url, row_factory=dict_row, autocommit=True)

    def connect_and_sync(self):
        """Load live rows from Supabase PostgreSQL tables if connection available."""
        url = settings.clean_database_url
        if not url:
            logger.info("No DATABASE_URL configured; running in standalone memory mode.")
            return

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # Users
                    cur.execute("SELECT * FROM users")
                    db_users = [clean_row(r) for r in cur.fetchall()]
                    if db_users:
                        self.users.clear()
                        for u in db_users:
                            super(SyncedTable, self.users).__setitem__(u["id"], u)

                    # Berths
                    cur.execute("SELECT * FROM berths")
                    db_berths = [clean_row(r) for r in cur.fetchall()]
                    if db_berths:
                        self.berths.clear()
                        for b in db_berths:
                            super(SyncedTable, self.berths).__setitem__(b["id"], b)

                    # Cranes
                    cur.execute("SELECT * FROM cranes")
                    db_cranes = [clean_row(r) for r in cur.fetchall()]
                    if db_cranes:
                        self.cranes.clear()
                        for c in db_cranes:
                            super(SyncedTable, self.cranes).__setitem__(c["id"], c)

                    # Yards
                    cur.execute("SELECT * FROM yards")
                    db_yards = [clean_row(r) for r in cur.fetchall()]
                    if db_yards:
                        self.yards.clear()
                        for y in db_yards:
                            if "utilization_percentage" not in y or y["utilization_percentage"] is None:
                                tot = y.get("total_capacity", 1) or 1
                                occ = y.get("occupied_capacity", 0) or 0
                                y["utilization_percentage"] = round((occ / tot) * 100, 2)
                            super(SyncedTable, self.yards).__setitem__(y["id"], y)

                    # Vessels
                    cur.execute("SELECT * FROM vessels")
                    db_vessels = [clean_row(r) for r in cur.fetchall()]
                    if db_vessels:
                        self.vessels.clear()
                        for v in db_vessels:
                            super(SyncedTable, self.vessels).__setitem__(v["id"], v)

                    # Disruptions
                    cur.execute("SELECT * FROM disruptions")
                    db_disruptions = [clean_row(r) for r in cur.fetchall()]
                    if db_disruptions:
                        self.disruptions.clear()
                        for d in db_disruptions:
                            super(SyncedTable, self.disruptions).__setitem__(d["id"], d)

                    # Optimization Runs
                    cur.execute("SELECT * FROM optimization_runs")
                    db_runs = [clean_row(r) for r in cur.fetchall()]
                    if db_runs:
                        self.optimization_runs.clear()
                        for r in db_runs:
                            # Rehydrate schedules from schedules table
                            super(SyncedTable, self.optimization_runs).__setitem__(r["id"], r)

                    # Schedules
                    cur.execute("SELECT * FROM schedules")
                    db_schedules = [clean_row(r) for r in cur.fetchall()]
                    if db_schedules:
                        self.schedules.clear()
                        for s in db_schedules:
                            super(SyncedTable, self.schedules).__setitem__(s["id"], s)

            self.is_connected = True
            print(f"Successfully connected to Supabase PostgreSQL: Loaded {len(self.vessels)} vessels, {len(self.berths)} berths, {len(self.cranes)} cranes, {len(self.yards)} yards.")
        except Exception as e:
            logger.warning(f"Failed to connect to Supabase PostgreSQL: {e}. Fallback to in-memory mode.")
            self.is_connected = False

    def persist_item(self, table_name: str, item: Dict[str, Any]):
        """UPSERT a single record into Supabase PostgreSQL."""
        if not self.is_connected or not settings.clean_database_url:
            return

        cols_allowed = TABLE_COLUMNS.get(table_name)
        if not cols_allowed:
            return

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cols_present = [c for c in cols_allowed if c in item]
                    if not cols_present or "id" not in item:
                        return

                    cols_str = ", ".join(cols_present)
                    placeholders = ", ".join(["%s"] * len(cols_present))
                    update_str = ", ".join([f"{c} = EXCLUDED.{c}" for c in cols_present if c != "id"])

                    values = []
                    for c in cols_present:
                        val = item[c]
                        if c in ("metrics_json", "assigned_cranes") and val is not None:
                            val = Jsonb(val)
                        values.append(val)

                    query = f"""
                        INSERT INTO {table_name} ({cols_str})
                        VALUES ({placeholders})
                        ON CONFLICT (id) DO UPDATE SET {update_str}
                    """
                    cur.execute(query, values)
        except Exception as e:
            logger.error(f"Error persisting to {table_name}: {e}")

    def delete_item(self, table_name: str, item_id: str):
        """Delete a record from Supabase PostgreSQL."""
        if not self.is_connected or not settings.clean_database_url:
            return

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(f"DELETE FROM {table_name} WHERE id = %s", (item_id,))
        except Exception as e:
            logger.error(f"Error deleting from {table_name}: {e}")

    def seed_defaults(self):
        """Initial baseline defaults if database is not yet seeded."""
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
            super(SyncedTable, self.users).__setitem__(u["id"], u)

        # 2. Berths
        berths_seed = [
            {"id": "b0000001-0000-0000-0000-000000000001", "berth_code": "B-01", "berth_name": "North Quay Ultra-Max 1", "max_vessel_length": 400.0, "status": "Occupied", "current_vessel_id": "f0000001-0000-0000-0000-000000000001", "available_from": now + timedelta(hours=6), "created_at": now, "updated_at": now},
            {"id": "b0000002-0000-0000-0000-000000000002", "berth_code": "B-02", "berth_name": "North Quay Ultra-Max 2", "max_vessel_length": 400.0, "status": "Maintenance", "current_vessel_id": None, "available_from": now + timedelta(hours=18), "created_at": now, "updated_at": now},
            {"id": "b0000003-0000-0000-0000-000000000003", "berth_code": "B-03", "berth_name": "Central Terminal Berth 3", "max_vessel_length": 350.0, "status": "Occupied", "current_vessel_id": "f0000002-0000-0000-0000-000000000002", "available_from": now + timedelta(hours=10), "created_at": now, "updated_at": now},
            {"id": "b0000004-0000-0000-0000-000000000004", "berth_code": "B-04", "berth_name": "Central Terminal Berth 4", "max_vessel_length": 320.0, "status": "Available", "current_vessel_id": None, "available_from": now, "created_at": now, "updated_at": now},
            {"id": "b0000005-0000-0000-0000-000000000005", "berth_code": "B-05", "berth_name": "South Feeder Quay 5", "max_vessel_length": 240.0, "status": "Available", "current_vessel_id": None, "available_from": now, "created_at": now, "updated_at": now}
        ]
        for b in berths_seed:
            super(SyncedTable, self.berths).__setitem__(b["id"], b)

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
            super(SyncedTable, self.cranes).__setitem__(c["id"], c)

        # 4. Yards
        yards_seed = [
            {"id": "e0000001-0000-0000-0000-000000000001", "yard_code": "YZ-01", "yard_name": "North Container Stacking (Inbound)", "cargo_type": "Container", "total_capacity": 8500, "occupied_capacity": 7140, "utilization_percentage": 84.0, "status": "Normal", "updated_at": now},
            {"id": "e0000002-0000-0000-0000-000000000002", "yard_code": "YZ-02", "yard_name": "North Container Stacking (Outbound)", "cargo_type": "Container", "total_capacity": 7500, "occupied_capacity": 6890, "utilization_percentage": 91.87, "status": "Near Capacity", "updated_at": now},
            {"id": "e0000003-0000-0000-0000-000000000003", "yard_code": "YZ-03", "yard_name": "Central Reefer & Hazardous Yard", "cargo_type": "Container", "total_capacity": 3000, "occupied_capacity": 2760, "utilization_percentage": 92.0, "status": "Congested", "updated_at": now},
            {"id": "e0000004-0000-0000-0000-000000000004", "yard_code": "YZ-04", "yard_name": "South Feeder Transfer Buffer", "cargo_type": "Container", "total_capacity": 5000, "occupied_capacity": 2450, "utilization_percentage": 49.0, "status": "Normal", "updated_at": now},
            {"id": "e0000005-0000-0000-0000-000000000005", "yard_code": "YZ-05", "yard_name": "General & Project Cargo Depot", "cargo_type": "General Cargo", "total_capacity": 4000, "occupied_capacity": 1800, "utilization_percentage": 45.0, "status": "Normal", "updated_at": now}
        ]
        for y in yards_seed:
            super(SyncedTable, self.yards).__setitem__(y["id"], y)

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
            super(SyncedTable, self.vessels).__setitem__(v["id"], v)

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
            super(SyncedTable, self.disruptions).__setitem__(d["id"], d)


# Global singleton repository instance
port_repo = PortRepository()
