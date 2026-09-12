import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

export function formatRelativeHours(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    const diffHours = (d.getTime() - Date.now()) / (1000 * 60 * 60);
    if (Math.abs(diffHours) < 0.5) return "Now";
    if (diffHours > 0) return `in ${Math.round(diffHours)}h`;
    return `${Math.abs(Math.round(diffHours))}h ago`;
  } catch {
    return "—";
  }
}

export function formatDuration(hours: number): string {
  if (hours <= 0) return "0h";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getPriorityMeta(priority: number): { label: string; badgeClass: string } {
  switch (priority) {
    case 1:
      return {
        label: "Priority 1 (Critical)",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 font-medium",
      };
    case 2:
      return {
        label: "Priority 2 (High)",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200 font-medium",
      };
    case 3:
      return {
        label: "Priority 3 (Standard)",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      };
    default:
      return {
        label: "Priority 4 (Low)",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
}

export function getStatusMeta(status: string): { label: string; badgeClass: string } {
  const s = status.toLowerCase();
  if (s === "available" || s === "completed" || s === "normal" || s === "optimal" || s === "resolved") {
    return {
      label: status,
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (s === "occupied" || s === "busy" || s === "loading" || s === "unloading" || s === "berthing" || s === "active") {
    return {
      label: status,
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }
  if (s === "waiting" || s === "maintenance" || s === "near capacity" || s === "feasible") {
    return {
      label: status,
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }
  if (s === "failed" || s === "delayed" || s === "congested" || s === "critical" || s === "infeasible") {
    return {
      label: status,
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    };
  }
  return {
    label: status,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  };
}
