"use client";

import React, { useState, useRef, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/design-system/card";
import { Button } from "@/design-system/button";
import { Badge } from "@/design-system/badge";
import { Bot, Send, Sparkles, HelpCircle, MessageSquare, Terminal, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";

interface Message {
  sender: "user" | "bot";
  text: string;
  time: string;
}

function nowUTC() {
  return (
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }) + " UTC"
  );
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Welcome to Bob AI Port Copilot. I am connected and ready to assist with port congestion analysis, vessel scheduling, berth and crane operations, disruption impact assessment, and optimization rationale. Ask me anything about NaviOps operations.",
      time: "— UTC",
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Maintain session history for multi-turn context
  const historyRef = useRef<Array<{ role: string; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestedQuestions = [
    "Which vessels are at risk of delay?",
    "Why is the port congested?",
    "What happens if a crane fails?",
    "Which vessel should be prioritized?",
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isLoading) return;

    setError(null);
    const time = nowUTC();
    const userMsg: Message = { sender: "user", text, time };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsLoading(true);

    // Build history snapshot before adding this turn
    const historySnapshot = [...historyRef.current];

    try {
      const response = await api.copilotChat(text, historySnapshot);
      const replyText = response.reply;

      // Persist turns for next request
      historyRef.current = [
        ...historySnapshot,
        { role: "user", content: text },
        { role: "assistant", content: replyText },
      ];

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: replyText, time: nowUTC() },
      ]);
    } catch (err: any) {
      const msg =
        err?.message ||
        "Bob Copilot is temporarily unavailable. Please try again.";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "⚠ " + msg,
          time: nowUTC(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell
      title="Bob AI Copilot"
      description="Operational AI assistant powered by Groq — port congestion, scheduling, and optimization insights."
    >
      {/* Notice Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900">
        <div className="flex items-center gap-2 font-bold text-blue-900">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span>Phase 2 — Live Groq-Powered Copilot</span>
        </div>
        <p className="mt-1 text-slate-600">
          Bob Copilot is now connected to Groq LLM inference. Read-only operational assistant: provides analysis, explanations, and recommendations. Write actions and live data tool calls are planned for Phase 3.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <Card className="lg:col-span-2 border-slate-200 flex flex-col h-[560px]">
          <CardHeader className="pb-3 border-b border-slate-100 flex-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600" />
                <CardTitle>Bob Copilot Chat Interface</CardTitle>
              </div>
              <Badge variant="status" status="Available">
                Live · Groq
              </Badge>
            </div>
            <CardDescription>
              Query quayside bottlenecks, simulate resource failures, and review optimization rationales
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                  <span>{m.sender === "user" ? "Port Staff" : "Bob Copilot"}</span>
                  <span>·</span>
                  <span>{m.time}</span>
                </div>
                <div
                  className={`rounded-xl p-3.5 text-xs max-w-lg shadow-2xs leading-relaxed whitespace-pre-wrap ${
                    m.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : m.text.startsWith("⚠")
                      ? "bg-rose-50 text-rose-800 rounded-bl-none border border-rose-200/80"
                      : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/80"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                  <span>Bob Copilot</span>
                  <span>·</span>
                  <span>thinking…</span>
                </div>
                <div className="rounded-xl rounded-bl-none border border-slate-200/80 bg-slate-100 p-3.5">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <CardFooter className="p-3 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              placeholder="Ask Bob about port delays, crane failures, or schedule explanations..."
              className="flex-1 h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none disabled:opacity-50"
              value={inputVal}
              disabled={isLoading}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSend()}
              disabled={isLoading || !inputVal.trim()}
              isLoading={isLoading}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              Send
            </Button>
          </CardFooter>
        </Card>

        {/* Suggested Queries & Future Agent Pipeline Architecture */}
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm">Example Operational Questions</CardTitle>
              </div>
              <CardDescription>Click to prompt the Copilot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  disabled={isLoading}
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
                <CardTitle className="text-sm">Phase 2 Agentic Architecture</CardTitle>
              </div>
              <CardDescription>Prepared agent pipelines</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2 pt-1">
              <div className="rounded border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] leading-relaxed">
                <div>1. Monitoring Agent → polling /api/dashboard/congestion</div>
                <div>2. Impact Agent → evaluates affected berths/cranes</div>
                <div>3. Optimization Agent → executes /api/optimization/run</div>
                <div>4. Evaluation Agent → compares wait time reductions</div>
                <div>5. Bob Copilot → provides human-in-the-loop approval</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
