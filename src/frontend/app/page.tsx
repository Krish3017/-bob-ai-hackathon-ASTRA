"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { KpiCard } from "@/design-system/kpi-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/card";
import { Badge } from "@/design-system/badge";
import { Button } from "@/design-system/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/design-system/table";
import { api } from "@/lib/api";
import { DashboardSummary, Berth, Vessel } from "@/types";
import { formatDateTime, formatDuration } from "@/lib/utils";
import {
  Ship,
  Anchor,
  Cpu,
  Boxes,
  AlertTriangle,
  Zap,
  TrendingUp,
  Activity,
  Compass,
  ArrowRight,
} from "lucide-react";

export default function OverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [berths, setBerths] = useState<Berth[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [sumData, berthsData, vesselsData] = await Promise.all([
        api.getDashboardSummary(),
        api.getBerths(),
        api.getVessels(),
      ]);
      setSummary(sumData);
      setBerths(berthsData);
      setVessels(vesselsData);
    } catch (err) {
      console.error("Failed to load overview data", err);
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

  return (
    <AppShell
      title="Operations Overview & Port Status"
      description="Real-time situational awareness across berths, STS cranes, container yards, and anchorage queue."
      congestionScore={congestion?.score || 45}
      congestionLevel={congestion?.level || "Moderate"}
      onRefresh={loadData}
      isRefreshing={refreshing}
    >
      {/* Top Operational KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Anchorage Queue"
          value={metrics?.waiting_at_anchorage ?? "—"}
          subtitle={`${metrics?.active_vessels_total || 0} active vessels in port domain`}
          statusColor={(metrics?.waiting_at_anchorage || 0) > 3 ? "amber" : "blue"}
          icon={<Ship className="h-5 w-5" />}
          trend={{
            value: `Avg wait: ${congestion?.avg_waiting_time_hours || 0}h`,
            isNeutral: true,
          }}
        />

        <KpiCard
          title="Berth Occupancy"
          value={`${metrics?.berth_utilization_rate ?? "—"}%`}
          subtitle={`${summary?.occupied_berths || 0} of ${summary?.total_berths || 0} berths alongside`}
          statusColor={(metrics?.berth_utilization_rate || 0) > 75 ? "amber" : "emerald"}
          icon={<Anchor className="h-5 w-5" />}
          trend={{
            value: `${summary?.available_berths || 0} Available`,
            isPositive: true,
          }}
        />

        <KpiCard
          title="Crane Availability"
          value={`${metrics?.crane_utilization_rate ?? "—"}%`}
          subtitle={`${summary?.operational_cranes || 0} active, ${summary?.failed_cranes || 0} offline`}
          statusColor={(summary?.failed_cranes || 0) > 0 ? "rose" : "blue"}
          icon={<Cpu className="h-5 w-5" />}
          trend={{
            value: `${summary?.failed_cranes || 0} Issues`,
            isPositive: (summary?.failed_cranes || 0) === 0,
          }}
        />

        <KpiCard
          title="Yard Stacking Stress"
          value={`${metrics?.yard_utilization_rate ?? "—"}%`}
          subtitle={`${summary?.total_occupied_yard?.toLocaleString() || 0} / ${summary?.total_yard_capacity?.toLocaleString() || 0} TEU`}
          statusColor={(metrics?.yard_utilization_rate || 0) > 85 ? "rose" : "emerald"}
          icon={<Boxes className="h-5 w-5" />}
          trend={{
            value: (metrics?.yard_utilization_rate || 0) > 85 ? "Critical" : "Stable",
            isPositive: (metrics?.yard_utilization_rate || 0) <= 85,
          }}
        />
      </div>

      {/* Congestion Explanation & Real-Time Scoring Breakdown */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <CardTitle>Port Congestion Index & Formula Breakdown</CardTitle>
            </div>
            <CardDescription>
              Transparent rule-based score (0–100) calculated dynamically from operational queues, resource loads, and active disruptions.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900">
                {congestion?.score || 0}
                <span className="text-sm font-normal text-slate-500"> / 100</span>
              </div>
              <Badge variant="status" status={congestion?.level || "Moderate"}>
                {congestion?.level} Congestion
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-slate-50 p-3 mb-4 text-xs text-slate-700 border border-slate-200/80">
            <span className="font-semibold text-slate-900">Diagnostic Summary: </span>
            {congestion?.explanation}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {congestion?.factors && congestion.factors.length > 0 ? (
              congestion.factors.map((factor, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{factor.name}</span>
                    <span className="font-mono font-medium text-blue-700">
                      +{factor.score_contribution} pts
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                    {factor.description}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Weight: {factor.weight > 0 ? `${(factor.weight * 100).toFixed(0)}%` : "Additive"}</span>
                    <span className="font-medium text-slate-600">Raw: {factor.raw_value}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-4 text-center text-xs text-slate-400 italic">
                Awaiting real-time congestion telemetry factors...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quayside Berths Status & Anchorage Waiting Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Berth Matrix */}
        <Card className="lg:col-span-1 border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Anchor className="h-4 w-4 text-blue-600" />
                <CardTitle>Terminal Berths</CardTitle>
              </div>
              <Link
                href="/berths"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription>Current alongside allocation and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {berths.map((berth) => {
              const assignedVessel = vessels.find((v) => v.id === berth.current_vessel_id);
              return (
                <div
                  key={berth.id}
                  className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/60 p-2.5 text-xs hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">{berth.berth_code}</span>
                      <span className="text-slate-500 font-medium truncate max-w-[120px]">
                        {berth.berth_name}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      Max {berth.max_vessel_length}m
                      {assignedVessel && ` · ${assignedVessel.vessel_name}`}
                    </div>
                  </div>
                  <Badge variant="status" status={berth.status}>
                    {berth.status}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Anchorage Queue & Arriving Vessels */}
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Ship className="h-4 w-4 text-blue-600" />
                <CardTitle>Anchorage Queue & Inbound Fleet</CardTitle>
              </div>
              <CardDescription>
                Prioritized vessels awaiting berth allocation or approaching fairway
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/optimization">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Zap className="h-3.5 w-3.5" />}
                >
                  Generate 72h Plan
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vessel</TableHead>
                  <TableHead>Line</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Wait Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vessels.slice(0, 6).map((vessel) => (
                  <TableRow key={vessel.id}>
                    <TableCell className="font-semibold text-slate-900">
                      <div>{vessel.vessel_name}</div>
                      <div className="text-[11px] font-normal text-slate-400">
                        {vessel.vessel_code} · {vessel.vessel_length}m
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{vessel.shipping_line}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">
                      {(vessel.cargo_volume ?? 0).toLocaleString()} TEU
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDateTime(vessel.eta)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="priority" priority={vessel.priority} />
                    </TableCell>
                    <TableCell className="font-medium text-slate-700 text-xs">
                      {vessel.expected_waiting_time > 0
                        ? formatDuration(vessel.expected_waiting_time)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="status" status={vessel.status}>
                        {vessel.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Active Disruptions Quick Strip */}
      {summary?.active_disruptions && summary.active_disruptions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-amber-900">Active Operational Disruptions ({summary.active_disruptions.length})</CardTitle>
              </div>
              <Link
                href="/disruptions"
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1"
              >
                Manage Incidents <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {summary.active_disruptions.map((disruption) => (
                <div
                  key={disruption.id}
                  className="rounded-lg border border-amber-200/80 bg-white p-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900">
                      {disruption.title}
                    </span>
                    <Badge variant="status" status={disruption.severity}>
                      {disruption.severity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">
                    {disruption.description}
                  </p>
                  <div className="mt-2 text-[10px] text-slate-400">
                    Started: {formatDateTime(disruption.start_time)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
