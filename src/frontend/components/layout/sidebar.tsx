"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Compass,
  Anchor,
  Layers,
  Cpu,
  Boxes,
  Zap,
  AlertTriangle,
  Bot,
  Ship,
  ShieldCheck,
  UserCheck,
  Eye,
  Users,
  KeyRound,
} from "lucide-react";

import { UserRole } from "@/types";

interface SidebarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const navItems = [
  {
    name: "Overview",
    href: "/",
    icon: LayoutDashboard,
    description: "Port KPI summary & metrics",
  },
  {
    name: "Operations Control",
    href: "/operations",
    icon: Compass,
    description: "Unified quayside control",
  },
  {
    name: "Vessels",
    href: "/vessels",
    icon: Ship,
    description: "Fleet arrivals & anchorage",
  },
  {
    name: "Berths",
    href: "/berths",
    icon: Anchor,
    description: "Terminal quay occupancy",
  },
  {
    name: "Cranes",
    href: "/cranes",
    icon: Cpu,
    description: "STS gantry availability",
  },
  {
    name: "Yard Capacity",
    href: "/yards",
    icon: Boxes,
    description: "Container stacking zones",
  },
  {
    name: "Optimization",
    href: "/optimization",
    icon: Zap,
    description: "72h CP-SAT schedule plan",
  },
  {
    name: "Disruptions",
    href: "/disruptions",
    icon: AlertTriangle,
    description: "Active impediments & logs",
  },
  {
    name: "Personnel & RBAC",
    href: "/users",
    icon: Users,
    description: "User directory & roles",
    adminOnly: true,
  },
  {
    name: "Bob Copilot",
    href: "/copilot",
    icon: Bot,
    description: "Phase 2 AI assistant preview",
  },
];

export function Sidebar({ currentRole, onRoleChange }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Anchor className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              NaviOps
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-blue-600">
              Port Optimizer
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span className="truncate">{item.name}</span>
              </div>
              {item.adminOnly && (
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                  Admin
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* RBAC Role Switcher & Login link */}
      <div className="border-t border-slate-200 bg-slate-50/70 p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Active Persona
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
            {currentRole === "admin" && <ShieldCheck className="h-3 w-3 text-blue-600" />}
            {currentRole === "operations" && <UserCheck className="h-3 w-3 text-emerald-600" />}
            {currentRole === "viewer" && <Eye className="h-3 w-3 text-amber-600" />}
            {currentRole.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-md bg-slate-200/60 p-1">
          <button
            type="button"
            onClick={() => onRoleChange("admin")}
            className={cn(
              "rounded px-2 py-1 text-[11px] font-medium transition-all",
              currentRole === "admin"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            )}
            title="Port Manager / Admin: Full CRUD & Schedule Approval"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => onRoleChange("operations")}
            className={cn(
              "rounded px-2 py-1 text-[11px] font-medium transition-all",
              currentRole === "operations"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            )}
            title="Operations Staff: Create/Edit & Optimization"
          >
            Ops
          </button>
          <button
            type="button"
            onClick={() => onRoleChange("viewer")}
            className={cn(
              "rounded px-2 py-1 text-[11px] font-medium transition-all",
              currentRole === "viewer"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            )}
            title="Viewer / Executive: Read-Only Dashboard"
          >
            Viewer
          </button>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
          <Link
            href="/login"
            className="text-slate-600 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors"
          >
            <KeyRound className="h-3 w-3" />
            Switch / Sign In
          </Link>
          <Link
            href="/users"
            className="text-slate-500 hover:text-slate-800 font-medium"
          >
            Manage Roles →
          </Link>
        </div>
      </div>
    </aside>
  );
}

