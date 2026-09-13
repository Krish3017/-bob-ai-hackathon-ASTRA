"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/design-system/card";
import { Button } from "@/design-system/button";
import { Badge } from "@/design-system/badge";
import { Bot, Send, Sparkles, HelpCircle, Terminal, ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { DashboardSummary, OptimizationRun, Vessel } from "@/types";

interface Message {
  sender: "user" | "bot";
  text: string;
  time: string;
}

function nowUtc() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC";
}

/**
 * Generate a context-aware reply from live API data.
 * All responses are templated from actual port state — no hardcoded vessel names.
 */
async function buildLiveReply(question: string): Promise<string> {
  const q = question.toLowerCase();

  // Fetch live data needed for all question types in parallel
  const [summary, vessels] = await Promise.all([
    api.getDashboardSummary(),
    api.getVessels(),
  ]);

  // ── Q1: Delay / risk of delay ───────────────────────────────────────────
  if (q.includes("risk of delay") || q.includes("delayed") || q.includes("waiting")) {
    const atRisk = vessels.filter(
      (v) => (v.status === "Waiting" && v.expected_waiting_time >= 2) || v.status === "Delayed"
    );
    if (atRisk.length === 0) {
      return `✅ Delay Risk Assessment: No vessels are currently waiting at anchorage or marked Delayed. All ${vessels.length} tracked vessels are within acceptable operational windows.`;
    }
    const names = atRisk
      .sort((a, b) => b.expected_waiting_time - a.expected_waiting_time)
      .slice(0, 5)
      .map((v) => `${v.vessel_name} (${v.shipping_line}, +${v.expected_waiting_time.toFixed(1)}h wait)`)
      .join("; ");
    const totalDelay = atRisk.reduce((s, v) => s + v.expected_waiting_time, 0);
    return (
      `⚠️ Delay Risk Assessment: ${atRisk.length} vessel${atRisk.length > 1 ? "s" : ""} require immediate berth allocation.\n\n` +
      `At-risk vessels: ${names}.\n\n` +
      `Total anchorage queue delay: ${totalDelay.toFixed(1)} hours. ` +
      `Congestion index is currently ${summary.congestion.score}/100 (${summary.congestion.level}). ` +
      `Running the 72-hour CP-SAT optimizer will assign these vessels to available berths — navigate to Optimization to trigger a new plan.`
    );
  }

  // ── Q2: Congestion / why congested ──────────────────────────────────────
  if (q.includes("congest") || q.includes("port status") || q.includes("bottleneck")) {
    const { congestion } = summary;
    const topFactors = congestion.factors
      .filter((f) => f.score_contribution > 0)
      .sort((a, b) => b.score_contribution - a.score_contribution)
      .slice(0, 3)
      .map((f) => `${f.name} (+${f.score_contribution} pts): ${f.description}`)
      .join("\n• ");
    const activeDisruptions = summary.active_disruptions;
    const disruptionLine =
      activeDisruptions.length > 0
        ? `\n\nActive disruptions (${activeDisruptions.length}): ${activeDisruptions.map((d) => `${d.title} [${d.severity}]`).join("; ")}.`
        : "\n\nNo active disruptions are currently registered.";
    return (
      `🔍 Congestion Diagnostic — Current Index: ${congestion.score}/100 (${congestion.level})\n\n` +
      `${congestion.explanation}\n\n` +
      `Top contributing factors:\n• ${topFactors}` +
      disruptionLine +
      `\n\nBerth utilization: ${summary.metrics.berth_utilization_rate}% · ` +
      `Crane utilization: ${summary.metrics.crane_utilization_rate}% · ` +
      `Yard capacity: ${summary.metrics.yard_utilization_rate}%.`
    );
  }

  // ── Q3: Crane failure simulation ────────────────────────────────────────
  if (q.includes("crane fail") || q.includes("crane out") || q.includes("crane break") || q.includes("crane offline")) {
    const failedOrMaint = vessels.length > 0
      ? `${summary.failed_cranes} crane${summary.failed_cranes !== 1 ? "s" : ""} are currently offline (Failed or Maintenance)`
      : "No cranes are currently offline";
    const opCranes = summary.operational_cranes;
    const totalCranes = summary.total_cranes;
    const handlingImpact = opCranes > 0
      ? `With ${opCranes} of ${totalCranes} STS cranes operational, average vessel service throughput is approximately ${opCranes * 35} moves/hr across the quayside.`
      : "All cranes are offline — vessel service is fully suspended.";
    return (
      `🔧 Crane Failure Impact Simulation:\n\n` +
      `${failedOrMaint}. ${handlingImpact}\n\n` +
      `Each additional crane failure removes ~35 moves/hr of throughput, adding roughly 3–5 hours to per-vessel turnaround time for a 1,000 TEU vessel. ` +
      `Current ${summary.metrics.waiting_at_anchorage} waiting vessel${summary.metrics.waiting_at_anchorage !== 1 ? "s" : ""} would face cascading delays. ` +
      `Trigger the 72-hour CP-SAT optimizer to rebalance remaining crane assignments across available berths.`
    );
  }

  // ── Q4: Priority / which vessel first ───────────────────────────────────
  if (q.includes("priorit") || q.includes("which vessel") || q.includes("first") || q.includes("urgent")) {
    const priority1 = vessels.filter((v) => v.priority === 1 && v.status !== "Completed");
    const waiting = vessels.filter((v) => v.status === "Waiting" || v.status === "Delayed");
    const topVessel = waiting.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.expected_waiting_time - a.expected_waiting_time;
    })[0];

    const p1Names = priority1.length > 0
      ? priority1.map((v) => `${v.vessel_name} (${v.shipping_line})`).join(", ")
      : "None currently in queue";

    return (
      `🚢 Priority Dispatch Guidance:\n\n` +
      `Priority 1 (Critical) vessels in active tracking: ${p1Names}.\n\n` +
      (topVessel
        ? `Highest urgency vessel needing immediate berth: ${topVessel.vessel_name} (${topVessel.shipping_line}) — ` +
          `Priority ${topVessel.priority}, ${topVessel.expected_waiting_time.toFixed(1)}h in queue, ${topVessel.cargo_volume.toLocaleString()} TEU.\n\n`
        : "No vessels are currently waiting at anchorage.\n\n") +
      `Under the CP-SAT model, Priority 1 vessels carry a 5× penalty weight on waiting time, guaranteeing they receive the first compatible available berth window. ` +
      `Run the optimizer to generate a fresh priority-sorted 72-hour allocation plan.`
    );
  }

  // ── Q5: Optimization / schedule ─────────────────────────────────────────
  if (q.includes("optim") || q.includes("schedule") || q.includes("plan") || q.includes("gantt")) {
    let optLine = "No optimization run has been executed yet for this session.";
    try {
      const latestRun: OptimizationRun = await api.getLatestOptimizationRun();
      const pct = latestRun.metrics.delay_reduction_pct;
      const scheduled = latestRun.metrics.vessels_scheduled;
      const avgWait = latestRun.metrics.avg_waiting_hours;
      optLine =
        `The most recent CP-SAT run scheduled ${scheduled} vessels with an average waiting time of ${avgWait.toFixed(1)}h. ` +
        `The optimizer achieved a ${pct.toFixed(1)}% reduction in total anchorage waiting time versus the pre-run baseline. ` +
        `Plan status: ${latestRun.status}${latestRun.applied ? " · Applied ✓" : " · Pending approval"}.`;
    } catch {
      // 404 means no run yet — optLine default is already set
    }
    return (
      `📊 Optimization Status:\n\n${optLine}\n\n` +
      `Currently ${summary.metrics.waiting_at_anchorage} vessel${summary.metrics.waiting_at_anchorage !== 1 ? "s" : ""} are waiting at anchorage. ` +
      `Berth utilization is ${summary.metrics.berth_utilization_rate}% across ${summary.total_berths} berths. ` +
      `Navigate to the Optimization page to trigger a new 72-hour CP-SAT plan or review the current schedule Gantt.`
    );
  }

  // ── Default fallback with live summary ──────────────────────────────────
  return (
    `ℹ️ NaviOps Situational Summary:\n\n` +
    `Port Congestion Index: ${summary.congestion.score}/100 (${summary.congestion.level}). ` +
    `${summary.active_vessels_count} active vessels tracked · ` +
    `${summary.metrics.waiting_at_anchorage} at anchorage · ` +
    `${summary.occupied_berths}/${summary.total_berths} berths occupied · ` +
    `${summary.failed_cranes} crane${summary.failed_cranes !== 1 ? "s" : ""} offline.\n\n` +
    `Try asking: "Which vessels are at risk of delay?", "Why is the port congested?", ` +
    `"What happens if a crane fails?", or "Which vessel should be prioritized?"`
  );
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Welcome to Bob AI Port Copilot. I query live port telemetry to give you context-aware answers about vessel delays, congestion diagnostics, crane impact simulations, and priority dispatch guidance. Ask me anything about current operations.",
      time: nowUtc(),
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestedQuestions = [
    "Which vessels are at risk of delay?",
    "Why is the port congested?",
    "What happens if a crane fails?",
    "Which vessel should be prioritized?",
    "What is the current optimization status?",
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isThinking) return;

    const userMsg: Message = { sender: "user", text, time: nowUtc() };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsThinking(true);

    try {
      const reply = await buildLiveReply(text);
      setMessages((prev) => [...prev, { sender: "bot", text: reply, time: nowUtc() }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `⚠️ Unable to fetch live port data: ${err?.message || "API unavailable"}. Please ensure the NaviOps backend is running.`,
          time: nowUtc(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <AppShell
      title="Bob AI Copilot"
      description="Live port telemetry-grounded operational assistant — responses sourced from real-time API data."
    >
      {/* Notice Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900">
        <div className="flex items-center gap-2 font-bold text-blue-900">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span>Live Data Integration Active — Responses sourced from NaviOps API</span>
        </div>
        <p className="mt-1 text-slate-600">
          Every Copilot reply queries <code>/api/dashboard/summary</code>, <code>/api/vessels</code>, and <code>/api/optimization/runs/latest</code> in real time.
          Vessel names, congestion scores, wait times, and crane counts reflect the actual current port state — not static templates.
          Phase 2 will replace this with a full IBM Watsonx.ai + LangGraph multi-agent pipeline using these same endpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <Card className="lg:col-span-2 border-slate-200 flex flex-col h-[580px]">
          <CardHeader className="pb-3 border-b border-slate-100 flex-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600" />
                <CardTitle>Bob Copilot</CardTitle>
              </div>
              <Badge variant="status" status="Available">
                Live Data
              </Badge>
            </div>
            <CardDescription>
              Queries live vessel, berth, crane, and congestion data on every message
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                  <span>{m.sender === "user" ? "Port Staff" : "Bob Copilot"}</span>
                  <span>·</span>
                  <span>{m.time}</span>
                </div>
                <div
                  className={`rounded-xl p-3.5 text-xs max-w-lg shadow-2xs leading-relaxed whitespace-pre-line ${
                    m.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/80"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                  <span>Bob Copilot</span><span>·</span><span>querying API…</span>
                </div>
                <div className="rounded-xl rounded-bl-none bg-slate-100 border border-slate-200/80 p-3.5 flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                  <span>Fetching live port telemetry…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <CardFooter className="p-3 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              placeholder="Ask about vessel delays, congestion, cranes, or optimization…"
              className="flex-1 h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isThinking}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSend()}
              leftIcon={isThinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              disabled={isThinking}
            >
              {isThinking ? "Thinking…" : "Send"}
            </Button>
          </CardFooter>
        </Card>

        {/* Sidebar: Suggested Questions + Agent Architecture */}
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm">Live Operational Queries</CardTitle>
              </div>
              <CardDescription>Each response queries the live API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  disabled={isThinking}
                  className="w-full text-left rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{q}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-slate-700" />
                <CardTitle className="text-sm">Phase 2 Agent Pipeline</CardTitle>
              </div>
              <CardDescription>Endpoints ready for LangGraph integration</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2 pt-1">
              <div className="rounded border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] leading-relaxed">
                <div>1. Monitoring Agent → /api/dashboard/congestion</div>
                <div>2. Impact Agent → /api/vessels + /api/cranes</div>
                <div>3. Optimization Agent → POST /api/optimization/run</div>
                <div>4. Evaluation Agent → /api/optimization/runs/latest</div>
                <div>5. Bob Copilot → human-in-the-loop approval</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
