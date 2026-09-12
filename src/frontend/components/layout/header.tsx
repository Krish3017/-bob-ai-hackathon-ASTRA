"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Clock, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/design-system/button";
import { Badge } from "@/design-system/badge";
import { api } from "@/lib/api";

interface HeaderProps {
  title: string;
  description?: string;
  congestionScore?: number;
  congestionLevel?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({
  title,
  description,
  congestionScore = 42.5,
  congestionLevel = "Moderate",
  onRefresh,
  isRefreshing = false,
}: HeaderProps) {
  const [timeStr, setTimeStr] = useState<string>("");
  const [utcStr, setUtcStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setUtcStr(
        now.toISOString().substring(11, 19) + " UTC"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleResetDemo = async () => {
    if (confirm("Reset synthetic demo dataset back to initial state?")) {
      try {
        await api.resetDemoData();
        if (onRefresh) onRefresh();
      } catch (err: any) {
        alert("Failed to reset demo: " + err.message);
      }
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-sm">
      {/* Page Title & Breadcrumb */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-slate-500 font-normal">{description}</p>
        )}
      </div>

      {/* Operational Status & Action Controls */}
      <div className="flex items-center gap-3">
        {/* Live Port Clock */}
        <div className="hidden md:flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 font-mono">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{timeStr || "19:40:00"}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">{utcStr || "14:10:00 UTC"}</span>
        </div>

        {/* Congestion Score Indicator */}
        <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1">
          <span className="text-xs text-slate-500 font-medium">Congestion:</span>
          <Badge
            variant="status"
            status={congestionLevel}
            size="sm"
            className="font-semibold text-xs"
          >
            {congestionScore.toFixed(0)}/100 · {congestionLevel}
          </Badge>
        </div>

        {/* Global Refresh Button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        )}

        {/* Demo Seed Reset Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetDemo}
          title="Restore pristine demo seed data"
          className="text-slate-500 hover:text-slate-700"
          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
        >
          Reset Demo
        </Button>

        {/* User Profile Pill & Login Link */}
        <a
          href="/login"
          className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 px-2.5 py-1 text-xs text-slate-700 transition-colors"
          title="Switch role or sign in with different credentials"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
            P
          </div>
          <span className="hidden lg:inline font-medium">Session</span>
          <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[10px] font-semibold uppercase text-slate-700">
            Login
          </span>
        </a>
      </div>
    </header>
  );
}

