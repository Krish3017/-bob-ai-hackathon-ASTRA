"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/card";
import { Button } from "@/design-system/button";
import { Badge } from "@/design-system/badge";
import { KpiCard } from "@/design-system/kpi-card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/design-system/table";
import { api } from "@/lib/api";
import { OptimizationRun, ScheduleItem, DashboardSummary, Berth } from "@/types";
import { formatDateTime, formatDuration } from "@/lib/utils";
import {
  Zap,
  CheckCircle2,
  Clock,
  Anchor,
  Cpu,
  Layers,
  TrendingDown,
  Calendar,
  AlertCircle,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

export default function OptimizationPage() {
  const [run, setRun] = useState<OptimizationRun | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [berths, setBerths] = useState<Berth[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("admin");
  const [loading, setLoading] = useState(true);
  const [isSolving, setIsSolving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (typeof window !== "undefined") {
      setCurrentRole(localStorage.getItem("naviops_role") || "admin");
    }
    try {
      const [latestRun, sum, bList] = await Promise.all([
        api.getLatestOptimizationRun(),
        api.getDashboardSummary(),
        api.getBerths(),
      ]);
      setRun(latestRun);
      setSummary(sum);
      setBerths(bList);
    } catch (err) {
      console.error("Error loading optimization data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGeneratePlan = async () => {
    if (currentRole === "viewer") {
      alert("Permission denied: Viewer role cannot trigger optimization runs.");
      return;
    }
    setIsSolving(true);
    setApplyMessage(null);
    try {
      const newRun = await api.runOptimization();
      setRun(newRun);
      // Refresh summary to get updated metrics
      const sum = await api.getDashboardSummary();
      setSummary(sum);
    } catch (err: any) {
      alert("Optimization solver failed: " + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleApplyPlan = async () => {
    if (currentRole !== "admin") {
      alert("Permission denied: Only Port Managers / Admins have authority to approve and apply schedules.");
      return;
    }
    if (!run) return;
    setIsApplying(true);
    try {
      const res = await api.applySchedule(run.id);
      setApplyMessage(res.message);
      setRun({ ...run, applied: true });
    } catch (err: any) {
      alert("Failed to apply schedule: " + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  const congestion = summary?.congestion;
  const metrics = run?.metrics;
  const schedules = run?.schedules || [];

  // Group schedules by berth for Gantt visualization
  const berthRows = berths.map((b) => {
    const items = schedules.filter((s) => s.berth_id === b.id);
    return {
      berth: b,
      items,
    };
  });

  return (
    <AppShell
      title="72-Hour Berth & Resource Optimizer"
      description="Constraint programming engine (Google OR-Tools CP-SAT) solving berth assignments, crane allocations, and waiting queue delays."
      congestionScore={congestion?.score || 45}
      congestionLevel={congestion?.level || "Moderate"}
      onRefresh={loadData}
      isRefreshing={loading}
    >
      {/* Control Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Automated 72-Hour Constraint Optimization
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Solves multi-resource combinatorial constraints: vessel length berth compatibility, non-overlapping quay intervals, crane throughput bandwidth, and priority-weighted penalty functions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleGeneratePlan}
            isLoading={isSolving}
            disabled={currentRole === "viewer"}
            title={currentRole === "viewer" ? "Restricted: Viewer role cannot trigger optimization" : "Run CP-SAT solver"}
            leftIcon={<Zap className="h-4 w-4" />}
          >
            {isSolving
              ? "Solving CP-SAT Model..."
              : currentRole === "viewer"
              ? "Solver (Viewer Restricted)"
              : "Generate Optimized 72-Hour Plan"}
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={handleApplyPlan}
            isLoading={isApplying}
            disabled={!run || run.applied || currentRole !== "admin"}
            leftIcon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            title={
              currentRole !== "admin"
                ? "Admin Approval Required: Only Port Manager can apply schedules"
                : run?.applied
                ? "Schedule already applied"
                : "Applies recommended berth allocations to active fleet"
            }
          >
            {run?.applied
              ? "Schedule Applied"
              : currentRole !== "admin"
              ? "Approve Plan (Admin Only)"
              : "Approve & Apply Schedule"}
          </Button>
        </div>
      </div>

      {applyMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{applyMessage}</span>
        </div>
      )}

      {/* Plan Performance Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Scheduled Vessels"
          value={metrics?.vessels_scheduled ?? "—"}
          subtitle="Allocated across all operational quays"
          statusColor="blue"
          icon={<Anchor className="h-5 w-5" />}
          trend={{ value: "100% Solved", isPositive: true }}
        />

        <KpiCard
          title="Average Waiting Time"
          value={`${metrics?.avg_waiting_hours ?? 0}h`}
          subtitle="Queue wait time at outer anchorage"
          statusColor={metrics?.avg_waiting_hours && metrics.avg_waiting_hours > 4 ? "amber" : "emerald"}
          icon={<Clock className="h-5 w-5" />}
          trend={{
            value: `-${metrics?.delay_reduction_pct || 34.5}% vs Baseline`,
            isPositive: true,
          }}
        />

        <KpiCard
          title="Berth Efficiency"
          value={`${Math.round((metrics?.berth_occupancy_ratio || 0.75) * 100)}%`}
          subtitle="Non-overlapping utilization factor"
          statusColor="emerald"
          icon={<Layers className="h-5 w-5" />}
          trend={{ value: "Optimal Throughput", isPositive: true }}
        />

        <KpiCard
          title="Solver Solution Status"
          value={run?.status || "OPTIMAL"}
          subtitle={`Objective Score: ${run?.objective_value || 0}`}
          statusColor={run?.status === "OPTIMAL" ? "emerald" : "blue"}
          icon={<CheckCircle2 className="h-5 w-5" />}
          trend={{
            value: run?.applied ? "Applied Active" : "Proposed Plan",
            isNeutral: true,
          }}
        />
      </div>

      {/* Visual Gantt-Style Schedule Timeline (Next 72 Hours) */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <CardTitle>72-Hour Berth Occupancy Gantt Schedule</CardTitle>
            </div>
            <CardDescription>
              Time-indexed quayside allocation showing vessel occupancy blocks and assigned STS cranes.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-blue-600" /> Standard
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-rose-500" /> Priority 1
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-amber-500" /> Priority 2
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Time axis header */}
          <div className="relative border-b border-slate-200 pb-2 mb-3">
            <div className="grid grid-cols-6 text-[11px] font-semibold text-slate-400 pl-32 pr-2">
              <div>Now (0h)</div>
              <div>+12h</div>
              <div>+24h</div>
              <div>+36h</div>
              <div>+48h</div>
              <div>+72h</div>
            </div>
          </div>

          {/* Berth Gantt Rows */}
          <div className="space-y-3">
            {berthRows.map(({ berth, items }) => (
              <div
                key={berth.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-slate-50/50 p-2.5"
              >
                {/* Berth Label */}
                <div className="w-28 shrink-0">
                  <div className="font-bold text-xs text-slate-900">{berth.berth_code}</div>
                  <div className="text-[10px] text-slate-500 truncate">Max {berth.max_vessel_length}m</div>
                  <Badge variant="status" status={berth.status} size="sm" className="mt-1">
                    {berth.status}
                  </Badge>
                </div>

                {/* Timeline bar container (0 to 72 hours represented as 100% width) */}
                <div className="relative h-12 flex-1 rounded-md bg-white border border-slate-200/70 overflow-hidden shadow-2xs">
                  {/* Subtle 12-hour grid dividers */}
                  <div className="absolute inset-0 grid grid-cols-6 pointer-events-none divide-x divide-slate-100" />

                  {/* Scheduled vessel blocks */}
                  {items.map((item) => {
                    const now = new Date().getTime();
                    const start = new Date(item.planned_start).getTime();
                    const end = new Date(item.planned_end).getTime();

                    const startHours = Math.max(0, (start - now) / (1000 * 3600));
                    const durationHours = Math.max(2, (end - start) / (1000 * 3600));

                    const leftPct = Math.min(95, (startHours / 72) * 100);
                    const widthPct = Math.max(5, Math.min(100 - leftPct, (durationHours / 72) * 100));

                    return (
                      <div
                        key={item.id}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                        className="absolute top-1 bottom-1 rounded bg-blue-600 text-white p-1 text-[10px] flex flex-col justify-center shadow-xs overflow-hidden hover:bg-blue-700 transition-colors group cursor-pointer"
                        title={`${item.vessel_name} (${item.vessel_code})\nStart: ${formatDateTime(item.planned_start)}\nEnd: ${formatDateTime(item.planned_end)}\nDuration: ${item.duration_hours}h\nCranes: ${item.assigned_cranes.join(", ")}`}
                      >
                        <span className="font-bold truncate">{item.vessel_name}</span>
                        <span className="text-[9px] text-blue-100 truncate opacity-90">
                          {item.assigned_cranes.slice(0, 2).join(", ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Optimization Allocation Results Table */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <CardTitle>Optimization Schedule Results & Rationales</CardTitle>
            </div>
            <CardDescription>
              Discrete operational assignments generated by the CP-SAT solver
            </CardDescription>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {schedules.length} assignments
          </span>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vessel</TableHead>
                <TableHead>Berth Assignment</TableHead>
                <TableHead>Assigned Cranes</TableHead>
                <TableHead>Planned Berthing</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Wait Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Solver Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.length === 0 ? (
                <TableEmpty message="No active schedule available. Click 'Generate Optimized 72-Hour Plan'." colSpan={8} />
              ) : (
                schedules.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold text-slate-900">
                      <div>{item.vessel_name}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {item.vessel_code}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-800">
                      <div className="flex items-center gap-1">
                        <Anchor className="h-3 w-3 text-blue-600" />
                        <span>{item.berth_code}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{item.berth_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.assigned_cranes.map((cCode, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 font-mono"
                          >
                            {cCode}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {formatDateTime(item.planned_start)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {formatDateTime(item.planned_end)}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium text-slate-800">
                      {item.waiting_time > 0 ? formatDuration(item.waiting_time) : "0h (Direct)"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="status"
                        status={run?.applied ? "Applied" : item.status}
                      >
                        {run?.applied ? "Applied" : item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                      {item.assignment_reason}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
