"use client";

import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, RotateCcw, LogOut, Shield, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { User } from "@/types";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  description?: string;
  congestionScore?: number;
  congestionLevel?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  user?: User | null;
  onLogout?: () => void;
}

export function Header({
  title,
  description,
  congestionScore = 42.5,
  congestionLevel = "Moderate",
  onRefresh,
  isRefreshing = false,
  user,
  onLogout,
}: HeaderProps) {
  const [updatedTime, setUpdatedTime] = useState<string>("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const now = new Date();
    setUpdatedTime(
      now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }, [isRefreshing]);

  // Close profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResetDemo = async () => {
    setIsProfileOpen(false);
    if (confirm("Reset demo dataset back to initial state? (Admin only)")) {
      try {
        await api.resetDemoData();
        if (onRefresh) onRefresh();
      } catch (err: any) {
        alert("Failed to reset demo: " + err.message);
      }
    }
  };

  const statusColor =
    congestionLevel === "Critical"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : congestionLevel === "High"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const dotColor =
    congestionLevel === "Critical"
      ? "bg-rose-500"
      : congestionLevel === "High"
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-xs">
      {/* Left: Title & Subtitle */}
      <div className="flex flex-col justify-center">
        <h1 className="text-sm font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="text-[11px] text-slate-500 font-normal leading-tight">
            {description}
          </p>
        )}
      </div>

      {/* Right: Status Pill, Last Updated, Refresh, Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Compact Status Pill */}
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            statusColor
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
          <span>
            {congestionLevel} · {congestionScore.toFixed(0)}/100
          </span>
        </div>

        {/* Compact Last Updated */}
        <div className="hidden sm:block text-[11px] text-slate-400 font-mono">
          Updated {updatedTime || "just now"}
        </div>

        {/* Refresh Action */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh operational telemetry"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-blue-600")}
            />
          </button>
        )}

        {/* Profile Dropdown */}
        {user && (
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 rounded-full py-0.5 pl-1 pr-2 text-xs hover:bg-slate-100 transition-colors"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="font-medium text-slate-700 hidden sm:inline max-w-[120px] truncate">
                {user.full_name}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg z-50 text-xs">
                <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
                  <div className="font-semibold text-slate-900 truncate">
                    {user.full_name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {user.email}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-blue-600">
                    <Shield className="h-3 w-3" />
                    <span className="capitalize">{user.role} Access</span>
                  </div>
                </div>

                {user.role === "admin" && (
                  <button
                    type="button"
                    onClick={handleResetDemo}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                    <span>Reset Demo Data</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-rose-600 hover:bg-rose-50 transition-colors text-left mt-1 border-t border-slate-100 pt-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
