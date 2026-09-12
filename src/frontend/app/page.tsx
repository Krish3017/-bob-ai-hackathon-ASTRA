"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { api } from "@/lib/api";
import { DashboardSummary, Berth, Vessel } from "@/types";
import { formatDuration } from "@/lib/utils";
import {
  Ship,
  Anchor,
  Cpu,
  Boxes,
  AlertTriangle,
  Zap,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [sumData, vesselsData] = await Promise.all([
        api.getDashboardSummary(),
        api.getVessels(),
      ]);
      setSummary(sumData);
      setVessels(vesselsData);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const congestion = summary?.congestion;
  const metrics = summary?.metrics;

  // Derive dynamic "Requires Attention" items from real telemetry
  interface AttentionItem {
    id: string;
    severity: "critical" | "warning" | "info";
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
  }

  const attentionItems: AttentionItem[] = [];

  // 1. Check active disruptions
  if (summary?.active_disruptions && summary.active_disruptions.length > 0) {
    summary.active_disruptions.slice(0, 2).forEach((d) => {
      attentionItems.push({
        id: `disruption-${d.id}`,
        severity: d.severity === "Critical" ? "critical" : "warning",
        title: d.title,
        description: d.description || "Operational disruption reported.",
        actionLabel: "View Disruption",
        actionHref: "/disruptions",
      });
    });
  }

  // 2. Check offline cranes
  if ((summary?.failed_cranes || 0) > 0) {
    attentionItems.push({
      id: "crane-outage",
      severity: "critical",
      title: `${summary?.failed_cranes} STS Crane Offline`,
      description: "Crane outage reduces handling rate at assigned berths. Optimization required.",
      actionLabel: "Inspect Cranes",
      actionHref: "/cranes",
    });
  }

  // 3. Check vessels waiting > 3h
  const delayedVessels = vessels.filter(
    (v) => (v.status === "Waiting" && v.expected_waiting_time >= 3) || v.status === "Delayed"
  );
  if (delayedVessels.length > 0) {
    const v = delayedVessels[0];
    attentionItems.push({
      id: `vessel-wait-${v.id}`,
      severity: "warning",
      title: `${v.vessel_name} Waiting > ${formatDuration(v.expected_waiting_time)}`,
      description: `Inbound ${v.shipping_line} vessel awaiting berth allocation in anchorage queue.`,
      actionLabel: "Assign Berth",
      actionHref: "/operations",
    });
  }

  // 4. Check high yard utilization
  if ((metrics?.yard_utilization_rate || 0) >= 80) {
    attentionItems.push({
      id: "yard-pressure",
      severity: (metrics?.yard_utilization_rate || 0) >= 90 ? "critical" : "warning",
      title: `High Yard Capacity Pressure (${metrics?.yard_utilization_rate}%)`,
      description: `${(summary?.total_occupied_yard || 0).toLocaleString()} TEU in container buffer zones.`,
      actionLabel: "Inspect Yards",
      actionHref: "/yards",
    });
  }

  return (
    <AppShell
      title="Port Operations Dashboard"
      description="Monitor real-time congestion, identify operational bottlenecks, and take targeted action."
      congestionScore={congestion?.score || 45}
      congestionLevel={congestion?.level || "Moderate"}
      onRefresh={loadData}
      isRefreshing={refreshing}
    >
      {/* 1. Primary Congestion Hero Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl font-bold text-white",
                congestion?.level === "Critical"
                  ? "bg-rose-600"
                  : congestion?.level === "High"
                  ? "bg-amber-600"
                  : "bg-emerald-600"
              )}
            >
              <span className="text-xl leading-none">{congestion?.score ?? 0}</span>
              <span className="text-[10px] font-medium opacity-80">/ 100</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-bold uppercase tracking-wider",
                    congestion?.level === "Critical"
                      ? "text-rose-700"
                      : congestion?.level === "High"
                      ? "text-amber-700"
                      : "text-emerald-700"
                  )}
                >
                  {congestion?.level || "Moderate"} Congestion
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-500">Port Index Status</span>
              </div>
              <h2 className="text-base font-semibold text-slate-900 mt-0.5">
                {congestion?.explanation || "Quayside and anchorage operational diagnostic summary."}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowFormulaDetails(!showFormulaDetails)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>{showFormulaDetails ? "Hide Calculation" : "View Calculation Details"}</span>
              {showFormulaDetails ? (
                <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>

            <Link href="/optimization">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Run 72h Optimization</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Expandable Calculation Details (Progressive Disclosure) */}
        {showFormulaDetails && (
          <div className="mt-4 border-t border-slate-100 pt-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-800">
                Congestion Factor Breakdown & Mathematical Weights
              </span>
              <span className="text-[11px] text-slate-400">
                Dynamic rule-based evaluation (0–100 scale)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {congestion?.factors && congestion.factors.length > 0 ? (
                congestion.factors.map((f, idx) => {
                  // Simplify technical names for readability
                  let friendlyName = f.name;
                  if (f.name.includes("Anchorage Queue")) friendlyName = "Vessels Waiting";
                  else if (f.name.includes("Berth Saturation")) friendlyName = "Berth Utilization";
                  else if (f.name.includes("Crane Fleet")) friendlyName = "Crane Utilization";
                  else if (f.name.includes("Yard Capacity")) friendlyName = "Yard Capacity Pressure";
                  else if (f.name.includes("Average Delay")) friendlyName = "Average Waiting Time";
                  else if (f.name.includes("Active Disruption")) friendlyName = "Disruption Impact";

                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-slate-800">{friendlyName}</span>
                        <span className="font-mono text-blue-700 font-semibold">
                          +{f.score_contribution} pts
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {f.description}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200/60 pt-1">
                        <span>Weight: {f.weight > 0 ? `${(f.weight * 100).toFixed(0)}%` : "Additive"}</span>
                        <span>Raw: {f.raw_value}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-2 text-center text-xs text-slate-400 italic">
                  Telemetry factor details loading...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Four Concise Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vessels Waiting */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Vessels Waiting</span>
            <Ship className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.waiting_at_anchorage ?? "—"}
            </span>
            <span className="text-xs text-slate-500">in queue</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>Avg wait: {congestion?.avg_waiting_time_hours || 0}h</span>
            <span className="text-slate-400">{metrics?.active_vessels_total || 0} total fleet</span>
          </div>
        </div>

        {/* Berth Utilization */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Berth Utilization</span>
            <Anchor className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.berth_utilization_rate ?? "—"}%
            </span>
            <span className="text-xs text-slate-500">occupied</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span>{summary?.available_berths ?? 0} berths available</span>
            <span className="text-slate-400">{summary?.total_berths ?? 0} total</span>
          </div>
        </div>

        {/* Crane Availability */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Crane Availability</span>
            <Cpu className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.crane_utilization_rate ?? "—"}%
            </span>
            <span className="text-xs text-slate-500">active</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            <span className={(summary?.failed_cranes || 0) > 0 ? "text-rose-600 font-semibold" : "text-slate-500"}>
              {summary?.failed_cranes ?? 0} offline
            </span>
            <span className="text-slate-400">{summary?.total_cranes ?? 0} STS cranes</span>
          </div>
        </div>

        {/* Yard Capacity */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Yard Capacity</span>
            <Boxes className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.yard_utilization_rate ?? "—"}%
            </span>
            <span className="text-xs text-slate-500">utilized</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 truncate">
            <span className="truncate">{(summary?.total_occupied_yard ?? 0).toLocaleString()} TEU</span>
            <span className="text-slate-400 shrink-0">/ {(summary?.total_yard_capacity ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 3. Operational Grid: Requires Attention & Recommended Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requires Attention */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Requires Attention ({attentionItems.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">High priority bottlenecks</span>
          </div>

          {attentionItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>All quayside assets operating within normal parameters.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {attentionItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-lg border p-3 text-xs transition-colors",
                    item.severity === "critical"
                      ? "border-rose-200 bg-rose-50/40"
                      : "border-amber-200 bg-amber-50/40"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          item.severity === "critical" ? "bg-rose-600" : "bg-amber-600"
                        )}
                      />
                      <span className="font-semibold text-slate-900">{item.title}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <Link href={item.actionHref} className="shrink-0">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommended Next Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Recommended Next Actions
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Operational playbook</span>
          </div>

          <div className="space-y-3">
            {/* Action 1: Optimization */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div>
                <div className="font-semibold text-xs text-slate-900">
                  Run 72-Hour Optimization
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Execute Google OR-Tools CP-SAT solver to clear anchorage queue backlog.
                </p>
              </div>
              <Link href="/optimization">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors shrink-0"
                >
                  <span>Open Solver</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </Link>
            </div>

            {/* Action 2: Operations Dispatch */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div>
                <div className="font-semibold text-xs text-slate-900">
                  Quayside Vessel Allocations
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Assign berths to waiting vessels and update turnaround progress.
                </p>
              </div>
              <Link href="/operations">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
                >
                  <span>Operations</span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                </button>
              </Link>
            </div>

            {/* Action 3: Review Disruptions */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
              <div>
                <div className="font-semibold text-xs text-slate-900">
                  Manage Incident Disruptions
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Review crane outages, channel impediments, and adverse weather impact.
                </p>
              </div>
              <Link href="/disruptions">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
                >
                  <span>Incidents</span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
