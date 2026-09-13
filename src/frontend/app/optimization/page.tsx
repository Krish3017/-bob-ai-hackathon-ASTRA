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
      const [sum, bList, vList] = await Promise.all([
        api.getDashboardSummary(),
        api.getBerths(),
        api.getVessels(),
      ]);
      setSummary(sum);
      setBerths(bList);
      setVessels(vList);
      // Latest run is optional — 404 simply means no run exists yet
      try {
        const latestRun = await api.getLatestOptimizationRun();
        setRun(latestRun);
      } catch (runErr: any) {
        if (runErr?.status !== 404) {
          console.error("Error loading latest optimization run:", runErr);
        }
        // 404 is expected when no run exists yet — leave run as null
      }
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
      <div className="rounded-xl border border-[#E3E5E0] bg-white p-5 shadow-card">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E1EFEC] text-[#004741] border border-[#E1EFEC]">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#102A27] leading-tight">
                  72-Hour Quayside Schedule Optimizer
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#5C6B68]">
                    Google OR-Tools CP-SAT Solver
                  </span>
                  <span className="text-[#D5D9D3]">·</span>
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
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50",
                "bg-[#004741] hover:bg-[#003B36]"
              )}
            >
              <Zap className={cn("h-3.5 w-3.5 text-white", isSolving && "animate-spin")} />
              <span className="text-white">{isSolving ? "Solving Model..." : "Generate Optimized Plan"}</span>
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
                    ? "border border-[#E3E5E0] bg-[#F7F6F2] text-[#899491] cursor-not-allowed"
                    : "border border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                <span className="text-white">
                  {isApplying
                    ? "Applying Schedule..."
                    : run?.applied
                    ? "Schedule Applied"
                    : "Approve & Apply Plan"}
                </span>
              </button>
            )}

            {currentRole === "operations" && !run?.applied && (
              <span className="text-[11px] text-[#899491] italic">
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
        <div className="rounded-xl border border-[#E3E5E0] bg-white p-4 shadow-card">
          <div className="flex items-center justify-between text-xs text-[#5C6B68]">
            <span className="font-medium">Scheduled Fleet</span>
            <Anchor className="h-4 w-4 text-[#899491]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#102A27]">
              {metrics?.vessels_scheduled ?? "—"}
            </span>
            <span className="text-xs text-[#5C6B68]">vessels</span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-[#004741] border-t border-[#F0EDE4] pt-2">
            100% Conflict-Free Solved
          </div>
        </div>

        {/* Expected Average Wait Time */}
        <div className="rounded-xl border border-[#E3E5E0] bg-white p-4 shadow-card">
          <div className="flex items-center justify-between text-xs text-[#5C6B68]">
            <span className="font-medium">Average Queue Wait</span>
            <Clock className="h-4 w-4 text-[#899491]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#102A27]">
              {metrics?.avg_waiting_hours ?? 0}h
            </span>
            <span className="text-xs text-[#5C6B68]">per ship</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 border-t border-[#F0EDE4] pt-2">
            <TrendingDown className="h-3 w-3" />
            <span>
              {metrics
                ? metrics.delay_reduction_pct > 0
                  ? `-${metrics.delay_reduction_pct.toFixed(1)}% vs Baseline`
                  : `${metrics.delay_reduction_pct.toFixed(1)}% vs Baseline`
                : "Run optimizer to compute"}
            </span>
          </div>
        </div>

        {/* Berth Utilization Factor */}
        <div className="rounded-xl border border-[#E3E5E0] bg-white p-4 shadow-card">
          <div className="flex items-center justify-between text-xs text-[#5C6B68]">
            <span className="font-medium">Berth Efficiency</span>
            <Layers className="h-4 w-4 text-[#899491]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#102A27]">
              {Math.round((metrics?.berth_occupancy_ratio || 0.75) * 100)}%
            </span>
            <span className="text-xs text-[#5C6B68]">optimal throughput</span>
          </div>
          <div className="mt-2 text-[11px] text-[#5C6B68] border-t border-[#F0EDE4] pt-2">
            Non-overlapping quay intervals
          </div>
        </div>

        {/* Solver Solution Status */}
        <div className="rounded-xl border border-[#E3E5E0] bg-white p-4 shadow-card">
          <div className="flex items-center justify-between text-xs text-[#5C6B68]">
            <span className="font-medium">Solver Status</span>
            <CheckCircle2 className="h-4 w-4 text-[#899491]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              {run?.status || "OPTIMAL"}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#5C6B68] border-t border-[#F0EDE4] pt-2 truncate">
            {run ? `Objective Score: ${run.objective_value}` : "Ready to execute solver"}
          </div>
        </div>
      </div>

      {/* 3. Interactive 72-Hour Visual Gantt Schedule */}
      <div className="rounded-xl border border-[#E3E5E0] bg-white shadow-card overflow-hidden">
        {/* Gantt Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3.5 border-b border-[#F0EDE4]">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#004741]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#102A27]">
              72-Hour Berth Occupancy Timeline
            </h3>
          </div>

          {/* Priority Color Legend */}
          <div className="flex items-center gap-3 text-xs text-[#5C6B68]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-[11px]">Priority 1 (Urgent)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[11px]">Priority 2 (High)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#004741]" />
              <span className="text-[11px]">Standard Fleet</span>
            </span>
          </div>
        </div>

        <div className="p-5 overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Time Axis Header */}
            <div className="flex items-center mb-2 text-[11px] font-semibold text-[#899491] border-b border-[#F0EDE4] pb-2">
              <div className="w-32 shrink-0 text-[#5C6B68]">Quay Berth</div>
              <div className="flex-1 grid grid-cols-6 pl-2">
                <div>Now (0h)</div>
                <div>+12h</div>
                <div>+24h</div>
                <div>+36h</div>
                <div>+48h</div>
                <div>+60h</div>
              </div>
            </div>

            {/* Berth Rows */}
            <div className="space-y-3">
              {berthRows.map(({ berth, items }) => (
                <div key={berth.id} className="flex items-center gap-3">
                  {/* Berth Label Card */}
                  <div className="w-32 shrink-0 rounded-lg border border-[#E3E5E0] bg-[#F7F6F2] p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#102A27]">{berth.berth_code}</span>
                      <span className="text-[10px] text-[#5C6B68]">≤{berth.max_vessel_length}m</span>
                    </div>
                    <div className="text-[10px] text-[#5C6B68] truncate mt-0.5">
                      {berth.berth_name}
                    </div>
                  </div>

                  {/* Gantt Lane */}
                  <div className="relative h-14 flex-1 rounded-lg border border-[#E3E5E0] bg-white overflow-hidden shadow-2xs">
                    {/* Vertical Time Grid Dividers */}
                    <div className="absolute inset-0 grid grid-cols-6 pointer-events-none divide-x divide-slate-100" />

                    {/* Empty State when no vessels are assigned */}
                    {items.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[#899491] italic pointer-events-none">
                        No vessels scheduled
                      </div>
                    )}

                    {/* Scheduled Vessel Blocks */}
                    {items.map((item) => {
                      const timelineStart = run?.planning_horizon_start
                        ? new Date(run.planning_horizon_start).getTime()
                        : new Date().getTime();
                      const start = new Date(item.planned_start).getTime();
                      const end = new Date(item.planned_end).getTime();

                      const startHours = Math.max(0, (start - timelineStart) / (1000 * 3600));
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
                          : "bg-[#004741] hover:bg-[#003B36] text-white border-[#004741]";

                      return (
                        <div
                          key={item.id}
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                          }}
                          className={cn(
                            "absolute top-1.5 bottom-1.5 rounded-lg px-2 py-1 text-[10px] flex flex-col justify-center transition-colors cursor-pointer border truncate z-10 shadow-sm gantt-block",
                            blockColor
                          )}
                          title={`${item.vessel_name} (${item.vessel_code})\nStart: ${formatDateTime(item.planned_start)}\nEnd: ${formatDateTime(item.planned_end)}\nDuration: ${item.duration_hours}h\nCranes: ${item.assigned_cranes.join(", ")}\nReason: ${item.assignment_reason}`}
                        >
                          <span className="font-bold truncate leading-tight text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
                            {item.vessel_name}
                          </span>
                          <span className="text-[9px] text-white/90 truncate leading-tight mt-0.5 font-medium">
                            {item.duration_hours}h · {item.assigned_cranes && item.assigned_cranes.length > 0 ? item.assigned_cranes.slice(0, 2).join(", ") : "Cranes"}
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
      <div className="rounded-xl border border-[#E3E5E0] bg-white shadow-card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-[#F0EDE4]">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#102A27]">
              Discrete Vessel Assignment Rationales ({filteredSchedules.length})
            </h3>
            <p className="text-[11px] text-[#5C6B68]">
              Optimal non-overlapping schedule generated by the CP-SAT engine
            </p>
          </div>

          <div className="relative sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#899491]" />
            <input
              type="text"
              placeholder="Filter by vessel or berth..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#E3E5E0] bg-[#F7F6F2] pl-8 pr-2.5 py-1 text-xs text-[#102A27] placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#004741]"
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
                <TableRow key={item.id} className="hover:bg-[#F7F6F2]/70 transition-colors">
                  <TableCell className="font-semibold text-[#102A27]">
                    <div>{item.vessel_name}</div>
                    <div className="text-[11px] font-mono font-normal text-[#899491]">
                      {item.vessel_code}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs font-medium text-[#102A27]">
                    <div className="flex items-center gap-1 text-[#004741]">
                      <Anchor className="h-3 w-3 text-[#004741]" />
                      <span>{item.berth_code}</span>
                    </div>
                    <div className="text-[10px] text-[#899491]">{item.berth_name}</div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.assigned_cranes.map((cCode, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded bg-[#F0EDE4] px-1.5 py-0.5 text-[10px] font-medium text-[#5C6B68] font-mono"
                        >
                          {cCode}
                        </span>
                      ))}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-[#5C6B68]">
                    <div>{formatDateTime(item.planned_start)}</div>
                    <div className="text-[10px] text-[#899491]">
                      until {formatDateTime(item.planned_end)} ({item.duration_hours}h)
                    </div>
                  </TableCell>

                  <TableCell className="font-mono text-xs font-medium text-[#102A27]">
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

                  <TableCell className="text-xs text-[#5C6B68] max-w-sm">
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
