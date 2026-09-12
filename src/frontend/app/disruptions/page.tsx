"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/design-system/table";
import { Badge } from "@/design-system/badge";
import { Button } from "@/design-system/button";
import { AddDisruptionModal } from "@/components/dialogs/add-disruption-modal";
import { api } from "@/lib/api";
import { Disruption, Berth, Crane } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { AlertTriangle, Plus, CheckCircle, Trash2 } from "lucide-react";

export default function DisruptionsPage() {
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [berths, setBerths] = useState<Berth[]>([]);
  const [cranes, setCranes] = useState<Crane[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("viewer");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const loadAll = async () => {
    if (typeof window !== "undefined") {
      setCurrentRole(localStorage.getItem("naviops_role") || "viewer");
    }
    try {
      const [dList, bList, cList] = await Promise.all([
        api.getDisruptions(),
        api.getBerths(),
        api.getCranes(),
      ]);
      setDisruptions(dList);
      setBerths(bList);
      setCranes(cList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentRole(localStorage.getItem("naviops_role") || "viewer");
    }
    loadAll();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await api.updateDisruption(id, { status: "Resolved" });
      loadAll();
    } catch (err: any) {
      alert("Failed to resolve disruption: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this disruption record? (Admin only)")) {
      try {
        await api.deleteDisruption(id);
        loadAll();
      } catch (err: any) {
        alert("Action restricted: " + err.message);
      }
    }
  };

  return (
    <AppShell
      title="Disruptions & Incident Center"
      description="Report and resolve unexpected equipment failures, adverse weather, or channel bottlenecks."
      onRefresh={loadAll}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Incident Registry</h2>
          <p className="text-xs text-slate-500">Active disruptions immediately penalize Congestion Index</p>
        </div>

        {currentRole !== "viewer" ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Report New Incident
          </Button>
        ) : (
          <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-500 font-medium italic">
            Read-Only (Viewer)
          </div>
        )}
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <CardTitle>Operational Impediments & Disruption Log</CardTitle>
          </div>
          <CardDescription>
            Chronological incidents affecting berths, cranes, or fairway navigation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident Title</TableHead>
                <TableHead>Disruption Type</TableHead>
                <TableHead>Affected Resource</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Reported At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disruptions.length === 0 ? (
                <TableEmpty message="No disruptions currently recorded." colSpan={7} />
              ) : (
                disruptions.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-semibold text-slate-900">
                      <div>{d.title}</div>
                      {d.description && (
                        <div className="text-xs text-slate-500 font-normal max-w-sm line-clamp-1">
                          {d.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">{d.disruption_type}</TableCell>
                    <TableCell className="text-xs uppercase font-mono font-medium text-slate-800">
                      {d.affected_resource_type}
                    </TableCell>
                    <TableCell>
                      <Badge variant="status" status={d.severity}>
                        {d.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{formatDateTime(d.start_time)}</TableCell>
                    <TableCell>
                      <Badge variant="status" status={d.status}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {currentRole !== "viewer" && d.status === "Active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                            onClick={() => handleResolve(d.id)}
                            leftIcon={<CheckCircle className="h-3.5 w-3.5" />}
                          >
                            Resolve
                          </Button>
                        )}
                        {currentRole === "admin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700"
                            onClick={() => handleDelete(d.id)}
                            title="Delete incident (Admin Only)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {currentRole === "viewer" && (
                          <span className="text-[11px] text-slate-400 font-medium italic">
                            Read-Only
                          </span>
                        )}
                      </div>
                    </TableCell>

                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddDisruptionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={loadAll}
        berths={berths}
        cranes={cranes}
      />
    </AppShell>
  );
}
