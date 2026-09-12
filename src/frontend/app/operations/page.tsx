"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/design-system/table";
import { Badge } from "@/design-system/badge";
import { AddVesselModal } from "@/components/dialogs/add-vessel-modal";
import { AddDisruptionModal } from "@/components/dialogs/add-disruption-modal";
import { UpdateResourceModal } from "@/components/dialogs/update-resource-modal";
import { api } from "@/lib/api";
import { Vessel, Berth, Crane } from "@/types";
import { formatDateTime, formatDuration } from "@/lib/utils";
import {
  Plus,
  AlertTriangle,
  Anchor,
  Ship,
  Edit2,
  Trash2,
  Zap,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OperationsPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [berths, setBerths] = useState<Berth[]>([]);
  const [cranes, setCranes] = useState<Crane[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("operations");
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Expandable row tracking
  const [expandedVesselId, setExpandedVesselId] = useState<string | null>(null);

  // Modal dialog states
  const [isAddVesselOpen, setIsAddVesselOpen] = useState(false);
  const [isAddDisruptionOpen, setIsAddDisruptionOpen] = useState(false);
  const [updateModalData, setUpdateModalData] = useState<{
    isOpen: boolean;
    type: "vessel" | "berth";
    resource: any;
  }>({
    isOpen: false,
    type: "vessel",
    resource: null,
  });

  const loadAll = async () => {
    try {
      setRefreshing(true);
      const [vList, bList, cList] = await Promise.all([
        api.getVessels(),
        api.getBerths(),
        api.getCranes(),
      ]);
      setVessels(vList);
      setBerths(bList);
      setCranes(cList);
    } catch (err) {
      console.error("Error loading operational data:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentRole(localStorage.getItem("naviops_role") || "operations");
    }
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
    const matchesStatus =
      statusFilter === "all" || v.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      v.vessel_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vessel_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.shipping_line.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const toggleRow = (id: string) => {
    setExpandedVesselId(expandedVesselId === id ? null : id);
  };

  return (
    <AppShell
      title="Operations Workspace"
      description="Manage vessel arrivals, berth assignments, queue prioritization, and quick status updates."
      onRefresh={loadAll}
      isRefreshing={refreshing}
      allowedRoles={["admin", "operations"]}
    >
      {/* 1. Primary Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddVesselOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Vessel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddDisruptionOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span>Report Disruption</span>
          </button>

          <Link href="/optimization">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Run 72h Solver</span>
            </button>
          </Link>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vessel or line..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Statuses ({vessels.length})</option>
              <option value="Waiting">Waiting ({vessels.filter((v) => v.status === "Waiting").length})</option>
              <option value="Unloading">Unloading ({vessels.filter((v) => v.status === "Unloading").length})</option>
              <option value="Loading">Loading ({vessels.filter((v) => v.status === "Loading").length})</option>
              <option value="Scheduled">Scheduled ({vessels.filter((v) => v.status === "Scheduled").length})</option>
              <option value="Delayed">Delayed ({vessels.filter((v) => v.status === "Delayed").length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Focused Vessel Operations Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Ship className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
              Vessel Fleet Queue ({filteredVessels.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Click any row to reveal carrier and cargo specifications
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Vessel</TableHead>
              <TableHead>ETA</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned Berth</TableHead>
              <TableHead>Wait Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVessels.length === 0 ? (
              <TableEmpty message="No vessels matching filter." colSpan={8} />
            ) : (
              filteredVessels.map((v) => {
                const assignedBerth = berths.find((b) => b.id === v.assigned_berth_id);
                const isExpanded = expandedVesselId === v.id;

                return (
                  <React.Fragment key={v.id}>
                    <TableRow
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-slate-50/80",
                        isExpanded && "bg-slate-50/50"
                      )}
                      onClick={() => toggleRow(v.id)}
                    >
                      <TableCell className="w-8 text-center text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 mx-auto" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        <div>{v.vessel_name}</div>
                        <div className="text-[11px] font-mono font-normal text-slate-400">
                          {v.vessel_code}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDateTime(v.eta)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="priority" priority={v.priority} size="sm" />
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-800">
                        {assignedBerth ? (
                          <span className="inline-flex items-center gap-1 text-blue-700">
                            <Anchor className="h-3 w-3 text-blue-600" />
                            {assignedBerth.berth_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium text-slate-700">
                        {v.expected_waiting_time > 0 ? (
                          <span className="text-amber-700 font-semibold">
                            +{formatDuration(v.expected_waiting_time)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0h</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="status" status={v.status} size="sm">
                          {v.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setUpdateModalData({
                                isOpen: true,
                                type: "vessel",
                                resource: v,
                              })
                            }
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title="Update Status / Reassign"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {currentRole === "admin" && (
                            <button
                              type="button"
                              onClick={() => handleDeleteVessel(v.id, v.vessel_name)}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Delete vessel record (Admin only)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Details Drawer/Row */}
                    {isExpanded && (
                      <TableRow className="bg-slate-50/60 border-t border-slate-100">
                        <TableCell colSpan={8} className="py-3 px-6">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                                Shipping Carrier
                              </span>
                              <span className="font-semibold text-slate-800 mt-0.5 block">
                                {v.shipping_line}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                                Cargo Specifications
                              </span>
                              <span className="font-semibold text-slate-800 mt-0.5 block">
                                {(v.cargo_volume ?? 0).toLocaleString()} TEU ({v.cargo_type})
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                                Vessel Length
                              </span>
                              <span className="font-semibold text-slate-800 mt-0.5 block">
                                {v.vessel_length} meters
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                                Estimated Departure (ETD)
                              </span>
                              <span className="font-semibold text-slate-800 mt-0.5 block">
                                {formatDateTime(v.etd)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
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
