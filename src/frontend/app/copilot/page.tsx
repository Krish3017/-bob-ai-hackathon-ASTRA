"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/design-system/button";
import {
  Bot,
  Send,
  AlertCircle,
  Zap,
  CheckCircle2,
  XCircle,
  Circle,
  Loader2,
  Activity,
} from "lucide-react";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MessageKind = "user" | "assistant" | "error" | "action-confirm" | "action-result";

interface Message {
  id: string;
  kind: MessageKind;
  text: string;
  time: string;
  toolsUsed?: string[];
  actionResult?: {
    status: "success" | "error";
    message: string;
    result?: Record<string, unknown> | null;
  };
}

// Tool progress step state
type StepState = "pending" | "active" | "done" | "error";

interface ToolStep {
  toolName: string;
  label: string;
  state: StepState;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_HISTORY_TURNS = 10;

// Chip suggestions — short labels that map to full questions
const SUGGESTION_CHIPS: { label: string; question: string }[] = [
  { label: "Congestion status", question: "What is the current congestion status?" },
  { label: "Waiting vessels", question: "Which vessels are waiting the longest?" },
  { label: "Active disruptions", question: "What disruptions are affecting operations?" },
  { label: "Resource availability", question: "What is the current availability of berths, cranes, and yards?" },
];

// Human-readable labels for internal tool names
const TOOL_LABELS: Record<string, string> = {
  get_dashboard_summary: "Fetching port overview",
  get_congestion_status: "Checking congestion metrics",
  get_waiting_vessels: "Reviewing waiting vessels",
  get_vessels: "Fetching vessel data",
  get_berths: "Checking berth availability",
  get_cranes: "Checking crane status",
  get_yard_capacity: "Reviewing yard capacity",
  get_active_disruptions: "Reviewing active disruptions",
  get_latest_optimization_plan: "Checking the latest optimization plan",
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? "Fetching live operational data";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowUTC(): string {
  return (
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }) + " UTC"
  );
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Markdown renderer — headings, bold, italic, code, bullets, numbered, tables
// ---------------------------------------------------------------------------

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip
    if (!line.trim()) {
      i++;
      continue;
    }

    // Heading: ## or ###
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    if (h2) {
      elements.push(
        <h2 key={i} className="mt-3 mb-1 text-sm font-semibold text-slate-900 leading-snug">
          {renderInline(h2[1])}
        </h2>
      );
      i++;
      continue;
    }
    if (h3) {
      elements.push(
        <h3 key={i} className="mt-2.5 mb-0.5 text-[13px] font-semibold text-slate-800 leading-snug">
          {renderInline(h3[1])}
        </h3>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="my-2 border-slate-100" />);
      i++;
      continue;
    }

    // Table — collect all consecutive table rows
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      // Parse header, separator, rows
      const rows = tableLines.filter((l) => !/^\s*\|[-| :]+\|\s*$/.test(l));
      if (rows.length > 0) {
        const parseCells = (row: string) =>
          row
            .split("|")
            .map((c) => c.trim())
            .filter((c) => c !== "");

        const header = parseCells(rows[0]);
        const body = rows.slice(1);

        elements.push(
          <div key={i} className="my-2 overflow-x-auto rounded border border-slate-100">
            <table className="w-full min-w-0 text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {header.map((h, j) => (
                    <th
                      key={j}
                      className="px-2.5 py-1.5 text-left font-semibold text-slate-600 whitespace-nowrap"
                    >
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => {
                  const cells = parseCells(row);
                  return (
                    <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      {cells.map((cell, ci) => (
                        <td key={ci} className="px-2.5 py-1.5 text-slate-700 align-top">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Unordered list item
    if (/^[-*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={i} className="my-1.5 space-y-1 pl-4 list-none">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-slate-400" aria-hidden="true" />
              <span className="leading-relaxed">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list item
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      elements.push(
        <ol key={i} className="my-1.5 space-y-1 pl-1 list-none">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="flex-none text-[11px] text-slate-400 font-medium tabular-nums min-w-[1.25rem] mt-px">
                {j + 1}.
              </span>
              <span className="leading-relaxed">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Heading-style bold line (e.g. "**Main contributors:**")
    if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
      elements.push(
        <p key={i} className="mt-3 mb-0.5 font-semibold text-slate-800 text-[13px]">
          {renderInline(line.trim())}
        </p>
      );
      i++;
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={i} className="leading-relaxed text-slate-700">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// ---------------------------------------------------------------------------
// Tool progress panel — shows while request is in flight
// ---------------------------------------------------------------------------

function ToolProgressPanel({ steps }: { steps: ToolStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
        <span className="font-medium">Bob Copilot</span>
        <span aria-hidden="true">·</span>
        <span>checking NaviOps</span>
      </div>
      <div
        className="rounded-xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm min-w-[220px]"
        role="status"
        aria-label="Bob is gathering data"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 mb-2.5">
          <Activity className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
          <span className="text-[11px] font-semibold text-slate-700">Checking NaviOps</span>
        </div>
        <ul className="space-y-1.5" aria-label="Data retrieval steps">
          {steps.map((step, i) => (
            <li key={i} className="flex items-center gap-2.5 text-[11px]">
              {step.state === "done" ? (
                <CheckCircle2
                  className="h-3 w-3 flex-none text-emerald-500"
                  aria-label="Done"
                />
              ) : step.state === "active" ? (
                <Loader2
                  className="h-3 w-3 flex-none text-blue-500 animate-spin"
                  aria-label="In progress"
                />
              ) : step.state === "error" ? (
                <XCircle
                  className="h-3 w-3 flex-none text-rose-400"
                  aria-label="Error"
                />
              ) : (
                <Circle
                  className="h-3 w-3 flex-none text-slate-300"
                  aria-label="Pending"
                />
              )}
              <span
                className={
                  step.state === "done"
                    ? "text-slate-500"
                    : step.state === "active"
                    ? "text-slate-800 font-medium"
                    : "text-slate-400"
                }
              >
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.kind === "user";
  const isError = msg.kind === "error";
  const isActionResult = msg.kind === "action-result";

  return (
    <div
      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
      role="listitem"
    >
      {/* Sender + timestamp */}
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
        <span className="font-medium">{isUser ? "You" : "Bob Copilot"}</span>
        <span aria-hidden="true">·</span>
        <time>{msg.time}</time>
        {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-600 flex items-center gap-1">
              <Activity className="h-2.5 w-2.5" aria-hidden="true" />
              Live data
            </span>
          </>
        )}
      </div>

      {/* Bubble */}
      {isUser ? (
        <div className="rounded-xl rounded-br-sm bg-blue-600 px-3.5 py-2.5 text-[13px] text-white max-w-lg leading-relaxed shadow-sm">
          {msg.text}
        </div>
      ) : isError ? (
        <div className="rounded-xl rounded-bl-sm border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-800 max-w-lg leading-relaxed flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 flex-none mt-0.5 text-rose-500" aria-hidden="true" />
          <span>{msg.text}</span>
        </div>
      ) : isActionResult && msg.actionResult ? (
        <ActionResultBubble result={msg.actionResult} />
      ) : (
        <div className="rounded-xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-800 max-w-2xl leading-relaxed shadow-sm">
          <RichText text={msg.text} />
        </div>
      )}
    </div>
  );
}

function ActionResultBubble({
  result,
}: {
  result: NonNullable<Message["actionResult"]>;
}) {
  const ok = result.status === "success";
  return (
    <div
      className={`rounded-xl rounded-bl-sm border px-4 py-3 text-[13px] max-w-lg shadow-sm ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5 font-semibold">
        {ok ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
        )}
        <span>{ok ? "Optimization Plan Generated" : "Action Failed"}</span>
      </div>
      <p className="leading-relaxed">{result.message}</p>
      {ok && result.result && (
        <div className="mt-2.5 pt-2.5 border-t border-emerald-200/70 space-y-0.5 text-[12px] text-emerald-700">
          {result.result["vessels_scheduled"] !== undefined && (
            <p>Vessels scheduled: <strong>{String(result.result["vessels_scheduled"])}</strong></p>
          )}
          {result.result["avg_waiting_time_hours"] !== undefined && (
            <p>Avg. wait time: <strong>{String(result.result["avg_waiting_time_hours"])}h</strong></p>
          )}
          {result.result["solver_status"] !== undefined && (
            <p>Solver status: <strong>{String(result.result["solver_status"])}</strong></p>
          )}
          <p className="text-[11px] text-emerald-600 mt-1">
            Plan is proposed only — apply it from the Optimization page.
          </p>
        </div>
      )}
    </div>
  );
}

// Simple typing indicator for non-tool requests
function SimpleTypingIndicator() {
  return (
    <div className="flex flex-col items-start" role="status" aria-label="Bob Copilot is thinking">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
        <span className="font-medium">Bob Copilot</span>
        <span aria-hidden="true">·</span>
        <span>thinking</span>
      </div>
      <div className="rounded-xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
        <div className="flex items-center gap-1" aria-hidden="true">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state — shown before any user message
// ---------------------------------------------------------------------------

function EmptyState({
  onChipClick,
  disabled,
}: {
  onChipClick: (q: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-center px-6 select-none">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white mb-4">
        <Bot className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="text-[15px] font-semibold text-slate-800 mb-1">
        Bob AI Copilot
      </h2>
      <p className="text-[13px] text-slate-500 max-w-xs leading-relaxed mb-6">
        Ask anything about current port operations — congestion, vessels, berths, cranes, or disruptions.
      </p>
      {/* Quick-action chips */}
      <div
        className="flex flex-wrap justify-center gap-2"
        role="list"
        aria-label="Suggested questions"
      >
        {SUGGESTION_CHIPS.map((chip, i) => (
          <button
            key={i}
            type="button"
            role="listitem"
            onClick={() => onChipClick(chip.question)}
            disabled={disabled}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={`Ask: ${chip.question}`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composer — fixed at bottom of chat workspace
// ---------------------------------------------------------------------------

function Composer({
  value,
  onChange,
  onSend,
  disabled,
  isLoading,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  isLoading: boolean;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex-none border-t border-slate-100 bg-white px-4 py-3">
      <div className="flex items-center gap-2 max-w-3xl mx-auto">
        <label htmlFor="copilot-input" className="sr-only">
          Message Bob Copilot
        </label>
        <input
          id="copilot-input"
          ref={inputRef}
          type="text"
          placeholder="Ask about congestion, vessels, berths, cranes, yards…"
          className="flex-1 h-10 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !disabled) {
              e.preventDefault();
              onSend();
            }
          }}
          autoComplete="off"
          aria-label="Message Bob Copilot"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<"run_optimization" | null>(null);
  // Tool progress steps — tracked during in-flight requests
  const [toolSteps, setToolSteps] = useState<ToolStep[]>([]);

  const historyRef = useRef<Array<{ role: string; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, toolSteps]);

  const addMessage = useCallback((msg: Omit<Message, "id" | "time"> & { time?: string }) => {
    setMessages((prev) => [...prev, { id: uid(), time: nowUTC(), ...msg }]);
  }, []);

  // Build preliminary tool steps from known tools — we optimistically show
  // "Understanding your question" first, then update as we get the response.
  // Since the API is synchronous we simulate progress with a timed animation.
  const startToolProgress = useCallback((estimatedTools?: string[]) => {
    const steps: ToolStep[] = [
      { toolName: "__understand__", label: "Understanding your question", state: "done" },
    ];
    if (estimatedTools && estimatedTools.length > 0) {
      estimatedTools.forEach((t) =>
        steps.push({ toolName: t, label: toolLabel(t), state: "pending" })
      );
    } else {
      steps.push({ toolName: "__fetch__", label: "Fetching live operational data", state: "active" });
    }
    setToolSteps(steps);
  }, []);

  const finalizeToolProgress = useCallback((toolsUsed: string[]) => {
    if (toolsUsed.length === 0) {
      setToolSteps([]);
      return;
    }
    setToolSteps(
      toolsUsed.map((t) => ({
        toolName: t,
        label: toolLabel(t),
        state: "done" as StepState,
      }))
    );
    // Auto-clear after a short delay so UI doesn't linger
    setTimeout(() => setToolSteps([]), 1800);
  }, []);

  // ---------- Send chat message ----------
  const handleSend = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend || inputVal).trim();
      if (!text || isLoading || isActionLoading) return;

      setInputVal("");
      setIsLoading(true);
      setPendingAction(null);
      setToolSteps([]);

      addMessage({ kind: "user", text });

      const snap = historyRef.current.slice(-MAX_HISTORY_TURNS);

      // Show tool progress after brief delay so fast responses don't flash it
      const progressTimer = setTimeout(() => {
        startToolProgress();
      }, 400);

      try {
        const response = await api.copilotChat(text, snap);
        clearTimeout(progressTimer);

        const replyText = response.reply;
        const toolsUsed = response.tools_used ?? [];

        // Update tool progress with actual tools used
        finalizeToolProgress(toolsUsed);

        // Update bounded history
        historyRef.current = [
          ...snap,
          { role: "user", content: text },
          { role: "assistant", content: replyText },
        ].slice(-MAX_HISTORY_TURNS * 2);

        addMessage({
          kind: "assistant",
          text: replyText,
          toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
        });

        // Detect optimization confirmation request
        if (
          /would you like me to proceed|shall i proceed|confirm.*optimization|proceed.*optimization/i.test(
            replyText
          )
        ) {
          setPendingAction("run_optimization");
        }
      } catch (err: unknown) {
        clearTimeout(progressTimer);
        setToolSteps([]);
        const errMsg =
          (err as { message?: string })?.message ||
          "Bob Copilot is temporarily unavailable. Please try again.";
        addMessage({ kind: "error", text: errMsg });
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [inputVal, isLoading, isActionLoading, addMessage, startToolProgress, finalizeToolProgress]
  );

  // ---------- Confirm optimization action ----------
  const handleConfirmOptimization = useCallback(async () => {
    setPendingAction(null);
    setIsActionLoading(true);

    addMessage({ kind: "user", text: "Yes, please generate the optimization plan." });

    try {
      const res = await api.copilotRunOptimization();

      const resultSummary =
        res.status === "success"
          ? `Optimization plan generated. ${res.result?.vessels_scheduled ?? "?"} vessels scheduled.`
          : "Optimization action failed.";

      historyRef.current = [
        ...historyRef.current,
        { role: "user", content: "Yes, please generate the optimization plan." },
        { role: "assistant", content: resultSummary },
      ].slice(-MAX_HISTORY_TURNS * 2);

      addMessage({
        kind: "action-result",
        text: "",
        actionResult: {
          status: res.status as "success" | "error",
          message: res.message,
          result: res.result,
        },
      });
    } catch (err: unknown) {
      const typedErr = err as { status?: number; message?: string };
      const msg =
        typedErr?.status === 403
          ? "You don't have permission to run the optimization. Operations Staff or Admin role required."
          : typedErr?.message || "The optimization action failed. Please try again.";
      addMessage({ kind: "error", text: msg });
    } finally {
      setIsActionLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [addMessage]);

  const handleDismissAction = useCallback(() => {
    setPendingAction(null);
    addMessage({
      kind: "assistant",
      text: "Understood — no optimization plan will be generated.",
    });
  }, [addMessage]);

  const isDisabled = isLoading || isActionLoading;
  const hasUserMessages = messages.length > 0;

  // ---------- Render ----------
  return (
    <AppShell
      title="Bob AI Copilot"
      description="Operational intelligence for NaviOps"
      copilotMode
    >
      {/* Full-height chat workspace — fills the available space inside AppShell */}
      <div className="flex flex-col h-full">
        {/* Conversation area — scrolls internally */}
        <div
          className="flex-1 overflow-y-auto min-h-0 px-4 py-4"
          aria-live="polite"
          aria-label="Conversation"
          role="list"
        >
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Empty state — visible only before any messages */}
            {!hasUserMessages && (
              <EmptyState onChipClick={handleSend} disabled={isDisabled} />
            )}

            {/* Messages */}
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}

            {/* Tool progress */}
            {isLoading && toolSteps.length > 0 && (
              <ToolProgressPanel steps={toolSteps} />
            )}

            {/* Simple typing indicator when no tool steps yet */}
            {isLoading && toolSteps.length === 0 && <SimpleTypingIndicator />}

            {/* Optimization confirmation prompt */}
            {pendingAction === "run_optimization" && (
              <div
                className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-900 max-w-lg"
                role="region"
                aria-label="Action confirmation required"
              >
                <div className="flex items-center gap-2 font-semibold mb-2">
                  <Zap className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                  Confirmation Required
                </div>
                <p className="mb-3 leading-relaxed text-amber-800">
                  This will generate a new 72-hour optimization plan using current vessel, berth, crane, and disruption data.{" "}
                  <strong>The plan will be proposed — not applied.</strong> A Port Manager must approve it from the Optimization page.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConfirmOptimization}
                    disabled={isDisabled}
                    isLoading={isActionLoading}
                    leftIcon={<Zap className="h-3 w-3" />}
                  >
                    Yes, generate plan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDismissAction}
                    disabled={isDisabled}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        </div>

        {/* Composer — fixed at bottom */}
        <Composer
          value={inputVal}
          onChange={setInputVal}
          onSend={() => handleSend()}
          disabled={isDisabled}
          isLoading={isLoading}
          inputRef={inputRef}
        />
      </div>
    </AppShell>
  );
}
