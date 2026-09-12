"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/design-system/table";
import { Badge } from "@/design-system/badge";
import { Button } from "@/design-system/button";
import { AddVesselModal } from "@/components/dialogs/add-vessel-modal";
import { UpdateResourceModal } from "@/components/dialogs/update-resource-modal";
import { api } from "@/lib/api";
import { Vessel, Berth } from "@/types";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { Ship, Plus, Edit2, Trash2, Anchor, Filter } from "lucide-react";

export default function VesselsPage() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [berths, setBerths] = useState<Berth[]>([]);
  const [filter, setFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [updateModal, setUpdateModal] = useState<{ isOpen: boolean; vessel: Vessel | null }>({
    isOpen: false,
    vessel: null,
  });

  const loadVessels = async () => {
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
    if (confirm(`Confirm deletion of ${name}? (Port Manager / Admin role required)`)) {
      try {
        await api.deleteVessel(id);
        loadVessels();
      } catch (err: any) {
        alert("Action restricted: " + err.message);
      }
    }
  };

  const filtered = vessels.filter((v) => {
    if (filter === "all") return true;
    return v.status.toLowerCase() === filter.toLowerCase();
  });

  return (
    <AppShell
      title="Vessels Fleet Management"
      description="Track inbound container ships, bulk carriers, and tankers with real-time ETA/ETD and priority tiers."
      onRefresh={loadVessels}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700"
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

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Vessel Record
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Ship className="h-4 w-4 text-blue-600" />
            <CardTitle>Registered Fleet & Queue</CardTitle>
          </div>
          <CardDescription>
            Fleet operations data connected directly to the optimization constraint solver
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vessel / IMO</TableHead>
                <TableHead>Carrier Line</TableHead>
                <TableHead>Cargo Type</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Length</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned Berth</TableHead>
                <TableHead>Wait Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableEmpty message="No vessels found matching criteria." colSpan={11} />
              ) : (
                filtered.map((v) => {
                  const b = berths.find((b) => b.id === v.assigned_berth_id);
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-semibold text-slate-900">
                        <div>{v.vessel_name}</div>
                        <div className="text-[11px] font-mono text-slate-400 font-normal">
                          {v.vessel_code}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{v.shipping_line}</TableCell>
                      <TableCell className="text-xs text-slate-600">{v.cargo_type}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-800">
                        {v.cargo_volume.toLocaleString()} TEU
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{v.vessel_length}m</TableCell>
                      <TableCell className="text-xs text-slate-600">{formatDateTime(v.eta)}</TableCell>
                      <TableCell>
                        <Badge variant="priority" priority={v.priority} />
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-800">
                        {b ? (
                          <span className="inline-flex items-center gap-1">
                            <Anchor className="h-3 w-3 text-blue-600" />
                            {b.berth_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-800">
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
                            onClick={() => setUpdateModal({ isOpen: true, vessel: v })}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700"
                            onClick={() => handleDelete(v.id, v.vessel_name)}
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
