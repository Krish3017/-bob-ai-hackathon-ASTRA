"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/design-system/card";
import { Button } from "@/design-system/button";
import { Badge } from "@/design-system/badge";
import {
  Bot,
  Send,
  HelpCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Zap,
  CheckCircle2,
  XCircle,
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
  actionResult?: {
    status: "success" | "error";
    message: string;
    result?: Record<string, unknown> | null;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_HISTORY_TURNS = 10;

const SUGGESTED_QUESTIONS = [
  "Why is congestion high right now?",
  "Which vessels are waiting the longest?",
  "What disruptions are affecting operations?",
  "Which cranes are unavailable?",
  "How much yard capacity remains?",
  "Explain the latest optimization plan.",
  "What should the operations team prioritize?",
];

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

/**
 * Minimal safe markdown renderer — handles **bold**, *italic*, bullet lists,
 * numbered lists, and `code`. Does NOT use dangerouslySetInnerHTML.
 */
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Unordered list item
    if (/^[-*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•]\s/, ""));
        i++;
      }
      elements.push(
        <ul key={i} className="my-1.5 space-y-0.5 pl-4 list-none">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-slate-400" />
              <span>{renderInline(item)}</span>
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
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={i} className="my-1.5 space-y-0.5 pl-4 list-none">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="flex-none text-slate-400 font-medium">{j + 1}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Heading-like bold line (e.g. "**Main contributors:**")
    if (/^\*\*[^*]+:\*\*$/.test(line.trim())) {
      elements.push(
        <p key={i} className="mt-2 mb-0.5 font-semibold text-slate-800">
          {renderInline(line.trim())}
        </p>
      );
      i++;
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={i} className="leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Split on **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[10px] text-slate-700">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// ---------------------------------------------------------------------------
// Sub-components
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
        <span className="font-medium">
          {isUser ? "You" : "Bob Copilot"}
        </span>
        <span aria-hidden="true">·</span>
        <time>{msg.time}</time>
      </div>

      {/* Bubble */}
      {isUser ? (
        <div className="rounded-xl rounded-br-sm bg-blue-600 px-3.5 py-3 text-xs text-white max-w-md leading-relaxed shadow-sm">
          {msg.text}
        </div>
      ) : isError ? (
        <div className="rounded-xl rounded-bl-sm border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-800 max-w-md leading-relaxed flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 flex-none mt-0.5 text-rose-500" aria-hidden="true" />
          <span>{msg.text}</span>
        </div>
      ) : isActionResult && msg.actionResult ? (
        <ActionResultBubble result={msg.actionResult} />
      ) : (
        <div className="rounded-xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-800 max-w-xl leading-relaxed shadow-sm space-y-1">
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
      className={`rounded-xl rounded-bl-sm border px-3.5 py-3 text-xs max-w-md shadow-sm ${
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
        <div className="mt-2 pt-2 border-t border-emerald-200/60 space-y-0.5 text-emerald-700">
          {result.result["vessels_scheduled"] !== undefined && (
            <p>Vessels scheduled: <strong>{String(result.result["vessels_scheduled"])}</strong></p>
          )}
          {result.result["avg_waiting_time_hours"] !== undefined && (
            <p>Avg. wait time: <strong>{String(result.result["avg_waiting_time_hours"])}h</strong></p>
          )}
          {result.result["solver_status"] !== undefined && (
            <p>Solver status: <strong>{String(result.result["solver_status"])}</strong></p>
          )}
          <p className="text-[10px] text-emerald-600 mt-1">
            Plan is proposed only — apply it from the Optimization page.
          </p>
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex flex-col items-start" role="status" aria-label="Bob Copilot is thinking">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
        <span className="font-medium">Bob Copilot</span>
        <span aria-hidden="true">·</span>
        <span>thinking…</span>
      </div>
      <div className="rounded-xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      kind: "assistant",
      text: "Welcome to Bob AI Copilot. I have live access to NaviOps operational data — vessel queues, berth status, crane availability, yard capacity, active disruptions, and the 72-hour optimization plan.\n\nAsk me anything about current port operations.",
      time: nowUTC(),
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<"run_optimization" | null>(null);

  // Session history for multi-turn context (bounded to MAX_HISTORY_TURNS)
  const historyRef = useRef<Array<{ role: string; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const addMessage = useCallback((msg: Omit<Message, "id" | "time"> & { time?: string }) => {
    setMessages((prev) => [...prev, { id: uid(), time: nowUTC(), ...msg }]);
  }, []);

  // ---------- Send chat message ----------
  const handleSend = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend || inputVal).trim();
      if (!text || isLoading || isActionLoading) return;

      setInputVal("");
      setIsLoading(true);
      setPendingAction(null);

      addMessage({ kind: "user", text });

      // Snapshot bounded history before this turn
      const snap = historyRef.current.slice(-MAX_HISTORY_TURNS);

      try {
        const response = await api.copilotChat(text, snap);
        const replyText = response.reply;

        // Check if LLM is signalling it wants to run optimization
        const wantsOptimization =
          /run.*optimization|generate.*plan|start.*optimizer|proceed.*optimize/i.test(replyText) &&
          !/would you like|confirm|proceed\?/i.test(replyText);

        // Update bounded history
        historyRef.current = [
          ...snap,
          { role: "user", content: text },
          { role: "assistant", content: replyText },
        ].slice(-MAX_HISTORY_TURNS * 2);

        addMessage({ kind: "assistant", text: replyText });

        // Detect optimization confirmation request from model
        if (
          /would you like me to proceed|shall i proceed|confirm.*optimization|proceed.*optimization/i.test(
            replyText
          )
        ) {
          setPendingAction("run_optimization");
        }
      } catch (err: any) {
        const errMsg =
          err?.message || "Bob Copilot is temporarily unavailable. Please try again.";
        addMessage({ kind: "error", text: errMsg });
      } finally {
        setIsLoading(false);
        // Return focus to input after response
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [inputVal, isLoading, isActionLoading, addMessage]
  );

  // ---------- Confirm optimization action ----------
  const handleConfirmOptimization = useCallback(async () => {
    setPendingAction(null);
    setIsActionLoading(true);

    addMessage({
      kind: "user",
      text: "Yes, please generate the optimization plan.",
    });

    try {
      const res = await api.copilotRunOptimization();

      // Update history with action outcome
      const resultSummary = res.status === "success"
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
    } catch (err: any) {
      const msg = err?.status === 403
        ? "You don't have permission to run the optimization. Operations Staff or Admin role required."
        : err?.message || "The optimization action failed. Please try again.";
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
      text: "Understood — no optimization plan will be generated. Let me know if you need anything else.",
    });
  }, [addMessage]);

  const isDisabled = isLoading || isActionLoading;

  // ---------- Render ----------
  return (
    <AppShell
      title="Bob AI Copilot"
      description="Operational assistant with live NaviOps data access."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Chat panel ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col" style={{ minHeight: 0 }}>
          <Card className="flex flex-col" style={{ height: "calc(100vh - 220px)", minHeight: 520 }}>

            {/* Header */}
            <CardHeader className="pb-3 border-b border-slate-100 flex-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white flex-none">
                    <Bot className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Bob Copilot</CardTitle>
                    <CardDescription className="text-[11px]">
                      Live NaviOps data · Read-only analysis
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="status" status="Available" className="flex-none">
                  Live
                </Badge>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent
              className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
              aria-live="polite"
              aria-label="Conversation"
              role="list"
            >
              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} />
              ))}

              {/* Action confirmation prompt */}
              {pendingAction === "run_optimization" && (
                <div
                  className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900"
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

              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} aria-hidden="true" />
            </CardContent>

            {/* Input */}
            <CardFooter className="flex-none p-3 border-t border-slate-100 mt-0 gap-2">
              <label htmlFor="copilot-input" className="sr-only">
                Message Bob Copilot
              </label>
              <input
                id="copilot-input"
                ref={inputRef}
                type="text"
                placeholder="Ask about congestion, vessels, berths, cranes, yards…"
                className="flex-1 h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 transition-colors"
                value={inputVal}
                disabled={isDisabled}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isDisabled) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                autoComplete="off"
                aria-label="Message Bob Copilot"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSend()}
                disabled={isDisabled || !inputVal.trim()}
                isLoading={isLoading}
                leftIcon={<Send className="h-3.5 w-3.5" aria-hidden="true" />}
                aria-label="Send message"
              >
                Send
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Suggested questions */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <CardTitle className="text-sm">Operational Questions</CardTitle>
              </div>
              <CardDescription>Click to ask Bob directly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-1">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={isDisabled}
                  className="w-full text-left rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors flex items-center justify-between group disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={`Ask: ${q}`}
                >
                  <span>{q}</span>
                  <ArrowRight
                    className="h-3 w-3 flex-none text-slate-300 group-hover:text-blue-500 transition-colors"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Capabilities summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Live Data Access</CardTitle>
              <CardDescription>Tools available in this session</CardDescription>
            </CardHeader>
            <CardContent className="pt-1">
              <ul className="space-y-1.5 text-xs text-slate-600" aria-label="Available data tools">
                {[
                  "Port congestion index & factors",
                  "Vessel queue & waiting times",
                  "Berth availability & occupancy",
                  "Crane status & capacity",
                  "Yard utilization & remaining capacity",
                  "Active disruptions & severity",
                  "72-hour optimization schedule",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-none"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">
                Data is fetched live from NaviOps. Bob will not fabricate operational values.
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </AppShell>
  );
}
