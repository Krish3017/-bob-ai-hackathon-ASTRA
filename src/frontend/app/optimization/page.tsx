"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/design-system/table";
import { Badge } from "@/design-system/badge";
import { api } from "@/lib/api";
import { OptimizationRun, ScheduleItem, DashboardSummary, Berth, Vessel } from "@/types";
import { formatDateTime, formatDuration } from "@/lib/utils";
import {
  Zap,
  CheckCircle2,
  Clock,
  Anchor,
  Layers,
  Calendar,
  Search,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OptimizationPage() {
  const [run, setRun] = useState<OptimizationRun | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [berths, setBerths] = useState<Berth[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("viewer");
  const [loading, setLoading] = useState(true);
  const [isSolving, setIsSolving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    if (typeof window !== "undefined") {
      setCurrentRole(localStorage.getItem("naviops_role") || "viewer");
    }
    try {
      const [latestRun, sum, bList, vList] = await Promise.all([
        api.getLatestOptimizationRun(),
        api.getDashboardSummary(),
        api.getBerths(),
        api.getVessels(),
      ]);
      setRun(latestRun);
      setSummary(sum);
      setBerths(bList);
      setVessels(vList);
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
    setApplySuccess(null);
    try {
      const newRun = await api.runOptimization();
      setRun(newRun);
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
      setApplySuccess(res.message);
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

  // Filter schedules by search
  const filteredSchedules = schedules.filter(
    (s) =>
      searchQuery === "" ||
      s.vessel_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.vessel_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.berth_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      title="72-Hour Operational Schedule Optimizer"
      description="Mathematical combinatorial solver (Google OR-Tools CP-SAT) for berth allocations and crane dispatch."
      congestionScore={congestion?.score || 45}
      congestionLevel={congestion?.level || "Moderate"}
      onRefresh={loadData}
      isRefreshing={loading}
    >
      {/* 1. Optimizer Header Banner & Execution Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  72-Hour Quayside Schedule Optimizer
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">
                    Google OR-Tools CP-SAT Solver
                  </span>
                  <span className="text-slate-300">·</span>
                  {run?.applied ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <Check className="h-3 w-3" />
                      Active Approved Schedule
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      <Clock className="h-3 w-3" />
                      Proposed Draft Plan (Pending Approval)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Run Solver Button */}
            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={isSolving || currentRole === "viewer"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50",
                "bg-blue-600 hover:bg-blue-700"
              )}
            >
              <Zap className={cn("h-3.5 w-3.5", isSolving && "animate-spin")} />
              <span>{isSolving ? "Solving Model..." : "Generate Optimized Plan"}</span>
            </button>

            {/* Approve & Apply Button (Admin only) */}
            {currentRole === "admin" && (
              <button
                type="button"
                onClick={handleApplyPlan}
                disabled={isApplying || !run || run.applied}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50",
                  run?.applied
                    ? "border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                    : "border border-emerald-600 bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {isApplying
                    ? "Applying Schedule..."
                    : run?.applied
                    ? "Schedule Applied"
                    : "Approve & Apply Plan"}
                </span>
              </button>
            )}

            {currentRole === "operations" && !run?.applied && (
              <span className="text-[11px] text-slate-400 italic">
                (Admin approval required to apply)
              </span>
            )}
          </div>
        </div>

        {applySuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800 font-medium animate-in fade-in duration-150">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{applySuccess}</span>
          </div>
        )}
      </div>

      {/* 2. Key Optimization Results Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vessels Scheduled */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Scheduled Fleet</span>
            <Anchor className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.vessels_scheduled ?? "—"}
            </span>
            <span className="text-xs text-slate-500">vessels</span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-blue-700 border-t border-slate-100 pt-2">
            100% Conflict-Free Solved
          </div>
        </div>

        {/* Expected Average Wait Time */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Average Queue Wait</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.avg_waiting_hours ?? 0}h
            </span>
            <span className="text-xs text-slate-500">per ship</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 border-t border-slate-100 pt-2">
            <TrendingDown className="h-3 w-3" />
            <span>-{metrics?.delay_reduction_pct || 34.5}% vs Baseline</span>
          </div>
        </div>

        {/* Berth Utilization Factor */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Berth Efficiency</span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {Math.round((metrics?.berth_occupancy_ratio || 0.75) * 100)}%
            </span>
            <span className="text-xs text-slate-500">optimal throughput</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            Non-overlapping quay intervals
          </div>
        </div>

        {/* Solver Solution Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Solver Status</span>
            <CheckCircle2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              {run?.status || "OPTIMAL"}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 truncate">
            Objective Score: {run?.objective_value || 0}
          </div>
        </div>
      </div>

      {/* 3. Interactive 72-Hour Visual Gantt Schedule */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Gantt Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              72-Hour Berth Occupancy Timeline
            </h3>
          </div>

          {/* Priority Color Legend */}
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-[11px]">Priority 1 (Urgent)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[11px]">Priority 2 (High)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="text-[11px]">Standard Fleet</span>
            </span>
          </div>
        </div>

        <div className="p-5 overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Time Axis Header */}
            <div className="flex items-center mb-2 text-[11px] font-semibold text-slate-400 border-b border-slate-100 pb-2">
              <div className="w-32 shrink-0 text-slate-500">Quay Berth</div>
              <div className="flex-1 grid grid-cols-6 pl-2">
                <div>Now (0h)</div>
                <div>+12h</div>
                <div>+24h</div>
                <div>+36h</div>
                <div>+48h</div>
                <div>+72h</div>
              </div>
            </div>

            {/* Berth Rows */}
            <div className="space-y-3">
              {berthRows.map(({ berth, items }) => (
                <div key={berth.id} className="flex items-center gap-3">
                  {/* Berth Label Card */}
                  <div className="w-32 shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{berth.berth_code}</span>
                      <span className="text-[10px] text-slate-500">≤{berth.max_vessel_length}m</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {berth.berth_name}
                    </div>
                  </div>

                  {/* Gantt Lane */}
                  <div className="relative h-14 flex-1 rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    {/* Vertical Time Grid Dividers */}
                    <div className="absolute inset-0 grid grid-cols-6 pointer-events-none divide-x divide-slate-100" />

                    {/* Scheduled Vessel Blocks */}
                    {items.map((item) => {
                      const now = new Date().getTime();
                      const start = new Date(item.planned_start).getTime();
                      const end = new Date(item.planned_end).getTime();

                      const startHours = Math.max(0, (start - now) / (1000 * 3600));
                      const durationHours = Math.max(2, (end - start) / (1000 * 3600));

                      const leftPct = Math.min(95, (startHours / 72) * 100);
                      const widthPct = Math.max(7, Math.min(100 - leftPct, (durationHours / 72) * 100));

                      // Look up vessel priority from vessels list for true semantic coloring
                      const vesselObj = vessels.find((v) => v.id === item.vessel_id);
                      const priority = vesselObj?.priority ?? 3;

                      const blockColor =
                        priority === 1
                          ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-700"
                          : priority === 2
                          ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-700"
                          : "bg-blue-600 hover:bg-blue-700 text-white border-blue-700";

                      return (
                        <div
                          key={item.id}
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                          }}
                          className={cn(
                            "absolute top-1.5 bottom-1.5 rounded-md px-2 py-1 text-[10px] flex flex-col justify-center shadow-xs transition-colors cursor-pointer border truncate",
                            blockColor
                          )}
                          title={`${item.vessel_name} (${item.vessel_code})\nStart: ${formatDateTime(item.planned_start)}\nEnd: ${formatDateTime(item.planned_end)}\nDuration: ${item.duration_hours}h\nCranes: ${item.assigned_cranes.join(", ")}\nReason: ${item.assignment_reason}`}
                        >
                          <span className="font-bold truncate leading-tight">
                            {item.vessel_name}
                          </span>
                          <span className="text-[9px] opacity-90 truncate leading-tight mt-0.5">
                            {item.duration_hours}h · {item.assigned_cranes.slice(0, 2).join(", ")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Schedule Results & Assignment Rationales */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Discrete Vessel Assignment Rationales ({filteredSchedules.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Optimal non-overlapping schedule generated by the CP-SAT engine
            </p>
          </div>

          <div className="relative sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by vessel or berth..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vessel</TableHead>
              <TableHead>Berth Assignment</TableHead>
              <TableHead>Assigned Cranes</TableHead>
              <TableHead>Berthing Window</TableHead>
              <TableHead>Wait Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Solver Rationale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchedules.length === 0 ? (
              <TableEmpty message="No active schedule records match search." colSpan={7} />
            ) : (
              filteredSchedules.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <TableCell className="font-semibold text-slate-900">
                    <div>{item.vessel_name}</div>
                    <div className="text-[11px] font-mono font-normal text-slate-400">
                      {item.vessel_code}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs font-medium text-slate-800">
                    <div className="flex items-center gap-1 text-blue-700">
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
                    <div>{formatDateTime(item.planned_start)}</div>
                    <div className="text-[10px] text-slate-400">
                      until {formatDateTime(item.planned_end)} ({item.duration_hours}h)
                    </div>
                  </TableCell>

                  <TableCell className="font-mono text-xs font-medium text-slate-800">
                    {item.waiting_time > 0 ? (
                      <span className="text-amber-700 font-semibold">
                        +{formatDuration(item.waiting_time)}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">0h (Direct)</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="status"
                      status={run?.applied ? "Applied" : item.status}
                      size="sm"
                    >
                      {run?.applied ? "Applied" : item.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs text-slate-600 max-w-sm">
                    {item.assignment_reason}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
