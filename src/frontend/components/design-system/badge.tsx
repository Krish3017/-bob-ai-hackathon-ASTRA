import React from "react";
import { cn, getStatusMeta, getPriorityMeta } from "@/lib/utils";

interface BadgeProps {
  children?: React.ReactNode;
  variant?: "default" | "status" | "priority" | "outline" | "metric";
  status?: string;
  priority?: number;
  className?: string;
  size?: "sm" | "md";
}

export function Badge({
  children,
  variant = "default",
  status,
  priority,
  className,
  size = "sm",
}: BadgeProps) {
  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
  let content = children;

  if (variant === "status" && status) {
    const meta = getStatusMeta(status);
    badgeStyle = meta.badgeClass;
    if (!content) content = meta.label;
  } else if (variant === "priority" && priority !== undefined) {
    const meta = getPriorityMeta(priority);
    badgeStyle = meta.badgeClass;
    if (!content) content = meta.label;
  } else if (variant === "outline") {
    badgeStyle = "bg-white text-slate-700 border-slate-300";
  }

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors tracking-tight select-none",
        sizeClasses,
        badgeStyle,
        className
      )}
    >
      {content}
    </span>
  );
}
