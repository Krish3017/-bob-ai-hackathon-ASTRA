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

export function formatDuration(hours?: number | null): string {
  if (!hours || isNaN(hours) || hours <= 0) return "0h";
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
        badgeClass: "bg-[#FCE9E8] text-[#B94A48] border-[#F2C4C3] font-medium",
      };
    case 2:
      return {
        label: "Priority 2 (High)",
        badgeClass: "bg-[#FFF4DE] text-[#C58A2B] border-[#F0D49A] font-medium",
      };
    case 3:
      return {
        label: "Priority 3 (Standard)",
        badgeClass: "bg-[#E1F0F2] text-[#2F7D8C] border-[#B0D7DE] font-medium",
      };
    default:
      return {
        label: "Priority 4 (Low)",
        badgeClass: "bg-[#F7F6F2] text-[#5C6B68] border-[#D5D9D3]",
      };
  }
}

export function getStatusMeta(status: string): { label: string; badgeClass: string } {
  const s = status.toLowerCase();

  // Green — positive operational states
  if (
    s === "available" ||
    s === "completed" ||
    s === "normal" ||
    s === "optimal" ||
    s === "resolved" ||
    s === "applied"
  ) {
    return {
      label: s === "applied" ? "Applied" : status,
      badgeClass: "bg-[#E5F2EA] text-[#2F7D5B] border-[#A8D9BC]",
    };
  }

  // Cyprus teal — active/busy states
  if (
    s === "occupied" ||
    s === "busy" ||
    s === "loading" ||
    s === "unloading" ||
    s === "berthing" ||
    s === "active" ||
    s === "proposed"
  ) {
    return {
      label: s === "proposed" ? "Proposed" : status,
      badgeClass: "bg-[#E1EFEC] text-[#004741] border-[#C5DDD9]",
    };
  }

  // Amber — caution/degraded states
  if (
    s === "waiting" ||
    s === "maintenance" ||
    s === "near capacity" ||
    s === "feasible" ||
    s === "scheduled"
  ) {
    return {
      label: status,
      badgeClass: "bg-[#FFF4DE] text-[#C58A2B] border-[#F0D49A]",
    };
  }

  // Red — critical/failed states
  if (
    s === "failed" ||
    s === "delayed" ||
    s === "congested" ||
    s === "critical" ||
    s === "infeasible"
  ) {
    return {
      label: status,
      badgeClass: "bg-[#FCE9E8] text-[#B94A48] border-[#F2C4C3]",
    };
  }

  return {
    label: status,
    badgeClass: "bg-[#F7F6F2] text-[#5C6B68] border-[#D5D9D3]",
  };
}
