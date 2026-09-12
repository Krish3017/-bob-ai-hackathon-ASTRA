"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/design-system/card";
import { Button } from "@/design-system/button";
import { Badge } from "@/design-system/badge";
import { Bot, Send, Sparkles, HelpCircle, MessageSquare, Terminal, ArrowRight } from "lucide-react";

export default function CopilotPage() {
  const [messages, setMessages] = useState<Array<{ sender: "user" | "bot"; text: string; time: string }>>([
    {
      sender: "bot",
      text: "Welcome to Bob AI Port Copilot. I am ready to assist with situational reasoning, delay impact forecasts, and quayside resource reallocations once Phase 2 agent workflows are activated.",
      time: "19:30 UTC",
    },
  ]);
  const [inputVal, setInputVal] = useState("");

  const suggestedQuestions = [
    "Which vessels are at risk of delay?",
    "Why is the port congested?",
    "What happens if a crane fails?",
    "Which vessel should be prioritized?",
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputVal;
    if (!text.trim()) return;

    const userMsg = {
      sender: "user" as const,
      text,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");

    // Phase 2 preview reply
    setTimeout(() => {
      let previewReply = "";
      if (text.includes("risk of delay")) {
        previewReply = "Analysis Preview: 3 vessels currently at anchorage have wait times >5 hours (Ever Given, Cosco Shipping Taurus, Maersk Mc-Kinney Moller). The 72-hour CP-SAT plan resolves this by shifting feeder vessels to Berth B-04.";
      } else if (text.includes("congested")) {
        previewReply = "Congestion Diagnostic: Berth B-02 is down for critical pneumatic fender maintenance, and crane CR-04 experienced a hydraulic seal failure, reducing STS throughput by 38 moves/hr.";
      } else if (text.includes("crane fails")) {
        previewReply = "Simulation Impact: A crane failure on North Quay drops twin-lift capacity from 80 to 40 moves/hr, increasing service turnaround by ~4.2 hours unless secondary feeder cranes CR-07/08 are mobilized.";
      } else {
        previewReply = "Priority Guidance: Priority 1 vessels (MSC Maya, Maersk Mc-Kinney Moller, OOCL Hong Kong, HMM Algeciras) carry a 5x penalty weight and are guaranteed first available quay windows under CP-SAT scheduling.";
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: previewReply,
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC",
        },
      ]);
    }, 400);
  };

  return (
    <AppShell
      title="Bob AI Copilot (Phase 2 Preview)"
      description="Interactive operational assistant interface prepared for LangGraph and multi-agent integration."
    >
      {/* Notice Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900">
        <div className="flex items-center gap-2 font-bold text-blue-900">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span>Phase 2 Agentic Architecture Integration Notice</span>
        </div>
        <p className="mt-1 text-slate-600">
          In this Phase 1 normal operational build, full multi-agent orchestration is disabled. Clean REST endpoints (/api/optimization/run, /api/dashboard/congestion, and /api/disruptions) are exposed so that Phase 2 LangGraph agents (Monitoring, Impact Analysis, and Re-Optimization) can interface directly without rewriting code.
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
                Phase 2 Prototype
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
                  className={`rounded-xl p-3.5 text-xs max-w-lg shadow-2xs leading-relaxed ${
                    m.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/80"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </CardContent>

          <CardFooter className="p-3 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              placeholder="Ask Bob about port delays, crane failures, or schedule explanations..."
              className="flex-1 h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSend()}
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
              <CardDescription>Click to prompt the Copilot preview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="w-full text-left rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors flex items-center justify-between group"
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
