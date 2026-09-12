import React from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  icon?: React.ReactNode;
  statusColor?: "emerald" | "blue" | "amber" | "rose" | "slate";
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  statusColor = "blue",
  className,
}: KpiCardProps) {
  const colorBorders = {
    emerald: "border-l-4 border-l-emerald-500",
    blue: "border-l-4 border-l-blue-600",
    amber: "border-l-4 border-l-amber-500",
    rose: "border-l-4 border-l-rose-500",
    slate: "border-l-4 border-l-slate-400",
  }[statusColor];

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md",
        colorBorders,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {title}
        </p>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </div>
        {trend && (
          <span
            className={cn(
              "text-xs font-semibold px-1.5 py-0.5 rounded",
              trend.isNeutral
                ? "bg-slate-100 text-slate-600"
                : trend.isPositive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500 font-normal truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
}
