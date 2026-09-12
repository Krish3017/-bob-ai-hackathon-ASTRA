"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/card";
import { Button } from "@/design-system/button";
import { Badge } from "@/design-system/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/design-system/table";
import { AddVesselModal } from "@/components/dialogs/add-vessel-modal";
import { AddDisruptionModal } from "@/components/dialogs/add-disruption-modal";
import { UpdateResourceModal } from "@/components/dialogs/update-resource-modal";
import { api, getAuthToken } from "@/lib/api";
import { Vessel, Berth, Crane, Yard, Disruption, DashboardSummary } from "@/types";
import { formatDateTime, formatDuration } from "@/lib/utils";
import {
  Plus,
  AlertTriangle,
  Anchor,
  Cpu,
  Boxes,
  Ship,
  Edit2,
  Trash2,
  Zap,
  Filter,
} from "lucide-react";
import Link from "next/link";

export default function OperationsPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [berths, setBerths] = useState<Berth[]>([]);
  const [cranes, setCranes] = useState<Crane[]>([]);
  const [yards, setYards] = useState<Yard[]>([]);
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [vesselStatusFilter, setVesselStatusFilter] = useState<string>("all");

  // Modals state
  const [isAddVesselOpen, setIsAddVesselOpen] = useState(false);
  const [isAddDisruptionOpen, setIsAddDisruptionOpen] = useState(false);
  const [updateModalData, setUpdateModalData] = useState<{
    isOpen: boolean;
    type: "vessel" | "berth" | "crane" | "yard";
    resource: any;
  }>({
    isOpen: false,
    type: "vessel",
    resource: null,
  });

  const loadAll = async () => {
    try {
      setRefreshing(true);
      const [vList, bList, cList, yList, dList, sum] = await Promise.all([
        api.getVessels(),
        api.getBerths(),
        api.getCranes(),
        api.getYards(),
        api.getDisruptions(),
        api.getDashboardSummary(),
      ]);
      setVessels(vList);
      setBerths(bList);
      setCranes(cList);
      setYards(yList);
      setDisruptions(dList);
      setSummary(sum);
    } catch (err) {
      console.error("Error loading operational data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleDeleteVessel = async (id: string, name: string) => {
    if (confirm(`Confirm deletion of vessel record: ${name}? (Admin only)`)) {
      try {
        await api.deleteVessel(id);
        loadAll();
      } catch (err: any) {
        alert("Action restricted: " + err.message);
      }
    }
  };

  const filteredVessels = vessels.filter((v) => {
    if (vesselStatusFilter === "all") return true;
    return v.status.toLowerCase() === vesselStatusFilter.toLowerCase();
  });

  return (
    <AppShell
      title="Operations Control Dashboard"
      description="Live quayside telemetry, equipment allocations, disruption management, and operational record updating."
      congestionScore={summary?.congestion?.score || 45}
      congestionLevel={summary?.congestion?.level || "Moderate"}
      onRefresh={loadAll}
      isRefreshing={refreshing}
    >
      {/* Action Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">
            Quick Operational Actions:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddVesselOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Vessel
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsAddDisruptionOpen(true)}
            leftIcon={<AlertTriangle className="h-4 w-4" />}
          >
            Report Disruption
          </Button>

          <Link href="/optimization">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Zap className="h-4 w-4 text-blue-600" />}
            >
              Run 72h Optimization
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. Vessel Operations Table */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4 text-blue-600" />
              <CardTitle>Vessel Fleet Operations</CardTitle>
            </div>
            <CardDescription>
              Real-time ETA, ETD, cargo volumes, and anchorage wait status
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 focus:outline-none"
              value={vesselStatusFilter}
              onChange={(e) => setVesselStatusFilter(e.target.value)}
            >
              <option value="all">All Vessels ({vessels.length})</option>
              <option value="Waiting">Waiting ({vessels.filter((v) => v.status === "Waiting").length})</option>
              <option value="Unloading">Unloading ({vessels.filter((v) => v.status === "Unloading").length})</option>
              <option value="Loading">Loading ({vessels.filter((v) => v.status === "Loading").length})</option>
              <option value="Scheduled">Scheduled ({vessels.filter((v) => v.status === "Scheduled").length})</option>
              <option value="Delayed">Delayed ({vessels.filter((v) => v.status === "Delayed").length})</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vessel Name & IMO</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Cargo / Length</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>ETD</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned Berth</TableHead>
                <TableHead>Wait Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVessels.length === 0 ? (
                <TableEmpty message="No vessels matching filter." colSpan={10} />
              ) : (
                filteredVessels.map((v) => {
                  const assignedBerth = berths.find((b) => b.id === v.assigned_berth_id);
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-semibold text-slate-900">
                        <div>{v.vessel_name}</div>
                        <div className="text-[11px] font-mono font-normal text-slate-400">
                          {v.vessel_code}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        {v.shipping_line}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        <div>{v.cargo_volume.toLocaleString()} TEU</div>
                        <div className="text-[11px] text-slate-400">{v.vessel_length}m</div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDateTime(v.eta)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDateTime(v.etd)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="priority" priority={v.priority} />
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-800">
                        {assignedBerth ? (
                          <span className="inline-flex items-center gap-1">
                            <Anchor className="h-3 w-3 text-blue-600" />
                            {assignedBerth.berth_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium text-slate-700">
                        {v.expected_waiting_time > 0
                          ? formatDuration(v.expected_waiting_time)
                          : "0h"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="status" status={v.status}>
                          {v.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setUpdateModalData({
                                isOpen: true,
                                type: "vessel",
                                resource: v,
                              })
                            }
                            title="Edit operational parameters"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => handleDeleteVessel(v.id, v.vessel_name)}
                            title="Delete vessel (Admin role required)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 2. Berths & Cranes Dual Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Berths Matrix */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Anchor className="h-4 w-4 text-blue-600" />
                <CardTitle>Berths & Quay Allocation</CardTitle>
              </div>
              <CardDescription>
                Terminal berthing lines and vessel length limits
              </CardDescription>
            </div>
            <Link href="/berths" className="text-xs font-semibold text-blue-600">
              Manage Berths →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {berths.map((b) => {
              const currentVessel = vessels.find((v) => v.id === b.current_vessel_id);
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-2xs hover:bg-slate-50/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {b.berth_code}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {b.berth_name}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span>Max: {b.max_vessel_length}m</span>
                      <span>·</span>
                      <span>
                        Current: {currentVessel ? currentVessel.vessel_name : "None (Clear)"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="status" status={b.status}>
                      {b.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setUpdateModalData({
                          isOpen: true,
                          type: "berth",
                          resource: b,
                        })
                      }
                    >
                      Update
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Cranes STS Grid */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-600" />
                <CardTitle>Ship-to-Shore (STS) Cranes</CardTitle>
              </div>
              <CardDescription>
                Gantry availability and moves-per-hour handling capacity
              </CardDescription>
            </div>
            <Link href="/cranes" className="text-xs font-semibold text-blue-600">
              Manage Cranes →
            </Link>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cranes.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">
                    {c.crane_code}
                  </span>
                  <Badge variant="status" status={c.status}>
                    {c.status}
                  </Badge>
                </div>
                <div className="mt-1 text-[11px] text-slate-500 truncate">
                  {c.crane_name}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-700">
                    {c.capacity_per_hour} moves/hr
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() =>
                      setUpdateModalData({
                        isOpen: true,
                        type: "crane",
                        resource: c,
                      })
                    }
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 3. Yard Capacity Stacking Zones */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-blue-600" />
              <CardTitle>Container Yard Capacity & Stacking Utilization</CardTitle>
            </div>
            <CardDescription>
              Storage buffer zones and real-time TEU volume tracking
            </CardDescription>
          </div>
          <Link href="/yards" className="text-xs font-semibold text-blue-600">
            View Yard Details →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {yards.map((y) => {
              const util = y.utilization_percentage || 0;
              const barColor =
                util >= 90 ? "bg-rose-500" : util >= 75 ? "bg-amber-500" : "bg-blue-600";
              return (
                <div
                  key={y.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900">{y.yard_code}</span>
                      <p className="text-[11px] text-slate-500 truncate max-w-[170px]">
                        {y.yard_name}
                      </p>
                    </div>
                    <Badge variant="status" status={y.status}>
                      {y.status}
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-xs mb-1">
                      <span className="text-slate-500">Utilization:</span>
                      <span className="font-bold text-slate-900">{util}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.min(100, util)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                    <span>
                      {y.occupied_capacity.toLocaleString()} / {y.total_capacity.toLocaleString()} TEU
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() =>
                        setUpdateModalData({
                          isOpen: true,
                          type: "yard",
                          resource: y,
                        })
                      }
                    >
                      Update
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialogs */}
      <AddVesselModal
        isOpen={isAddVesselOpen}
        onClose={() => setIsAddVesselOpen(false)}
        onSuccess={loadAll}
      />

      <AddDisruptionModal
        isOpen={isAddDisruptionOpen}
        onClose={() => setIsAddDisruptionOpen(false)}
        onSuccess={loadAll}
        berths={berths}
        cranes={cranes}
      />

      {updateModalData.isOpen && (
        <UpdateResourceModal
          isOpen={updateModalData.isOpen}
          onClose={() =>
            setUpdateModalData({ isOpen: false, type: "vessel", resource: null })
          }
          onSuccess={loadAll}
          resourceType={updateModalData.type}
          resource={updateModalData.resource}
        />
      )}
    </AppShell>
  );
}
