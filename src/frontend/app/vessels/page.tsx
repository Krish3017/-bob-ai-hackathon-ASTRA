"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AssetTabs } from "@/components/layout/asset-tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/design-system/table";
import { Badge } from "@/design-system/badge";
import { AddVesselModal } from "@/components/dialogs/add-vessel-modal";
import { UpdateResourceModal } from "@/components/dialogs/update-resource-modal";
import { api } from "@/lib/api";
import { Vessel, Berth } from "@/types";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { Ship, Plus, Edit2, Trash2, Anchor, Search, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VesselsPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [berths, setBerths] = useState<Berth[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string>("operations");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [updateModal, setUpdateModal] = useState<{ isOpen: boolean; vessel: Vessel | null }>({
    isOpen: false,
    vessel: null,
  });

  const loadVessels = async () => {
    if (typeof window !== "undefined") {
      setCurrentRole(localStorage.getItem("naviops_role") || "operations");
    }
    try {
      const [vList, bList] = await Promise.all([api.getVessels(), api.getBerths()]);
      setVessels(vList);
      setBerths(bList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadVessels();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Confirm deletion of vessel: ${name}? (Port Admin role required)`)) {
      try {
        await api.deleteVessel(id);
        loadVessels();
      } catch (err: any) {
        alert("Action restricted: " + err.message);
      }
    }
  };

  const filtered = vessels.filter((v) => {
    const matchesFilter = filter === "all" || v.status.toLowerCase() === filter.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      v.vessel_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vessel_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.shipping_line.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const toggleRow = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <AppShell
      title="Asset Directory: Vessels Fleet"
      description="Fleet registry, technical specifications, carrier lines, and arrival itineraries."
      onRefresh={loadVessels}
      allowedRoles={["admin", "operations", "viewer"]}
    >
      {/* Shared Asset Navigation Tabs */}
      <AssetTabs />

      {/* Action & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vessel or carrier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Statuses ({vessels.length})</option>
            <option value="Waiting">Waiting ({vessels.filter((v) => v.status === "Waiting").length})</option>
            <option value="Unloading">Unloading ({vessels.filter((v) => v.status === "Unloading").length})</option>
            <option value="Loading">Loading ({vessels.filter((v) => v.status === "Loading").length})</option>
            <option value="Scheduled">Scheduled ({vessels.filter((v) => v.status === "Scheduled").length})</option>
            <option value="Delayed">Delayed ({vessels.filter((v) => v.status === "Delayed").length})</option>
          </select>
        </div>

        {currentRole !== "viewer" && (
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Vessel</span>
          </button>
        )}
      </div>

      {/* Vessel Fleet Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Vessel / IMO</TableHead>
              <TableHead>Carrier Line</TableHead>
              <TableHead>Cargo Type</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>ETA</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned Berth</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableEmpty colSpan={10} message="No vessels found matching criteria." />
            ) : (
              filtered.map((v) => {
                const assignedBerth = berths.find((b) => b.id === v.assigned_berth_id);
                const isExpanded = expandedId === v.id;

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
                      <TableCell className="font-medium text-slate-700 text-xs">
                        {v.shipping_line}
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">{v.cargo_type}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {(v.cargo_volume ?? 0).toLocaleString()} TEU
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {v.eta ? formatDateTime(v.eta) : "Arrived"}
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
                      <TableCell>
                        <Badge variant="status" status={v.status} size="sm">
                          {v.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {currentRole !== "viewer" && (
                            <button
                              type="button"
                              onClick={() => setUpdateModal({ isOpen: true, vessel: v })}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                              title="Edit vessel operational status"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {currentRole === "admin" && (
                            <button
                              type="button"
                              onClick={() => handleDelete(v.id, v.vessel_name)}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Delete vessel (Admin Only)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {currentRole === "viewer" && (
                            <span className="text-[11px] text-slate-400 italic">Read-Only</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Specifications Row */}
                    {isExpanded && (
                      <TableRow className="bg-slate-50/60 border-t border-slate-100">
                        <TableCell colSpan={10} className="py-3 px-6">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
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
                            <div>
                              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                                Expected Wait Time
                              </span>
                              <span className="font-semibold text-slate-800 mt-0.5 block">
                                {v.expected_waiting_time > 0
                                  ? formatDuration(v.expected_waiting_time)
                                  : "0 hours"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                                Actual Arrival Time
                              </span>
                              <span className="font-semibold text-slate-800 mt-0.5 block">
                                {v.arrival_time ? formatDateTime(v.arrival_time) : "Pending Entry"}
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

      <AddVesselModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={loadVessels}
      />

      {updateModal.isOpen && updateModal.vessel && (
        <UpdateResourceModal
          isOpen={updateModal.isOpen}
          onClose={() => setUpdateModal({ isOpen: false, vessel: null })}
          onSuccess={loadVessels}
          resourceType="vessel"
          resource={updateModal.vessel}
        />
      )}
    </AppShell>
  );
}
