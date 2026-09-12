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
  LogOut,
} from "lucide-react";
import { User, UserRole } from "@/types";

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  description: string;
  roles: UserRole[];
  badge?: string;
}

const navItems: NavItem[] = [
  {
    name: "Overview",
    href: "/",
    icon: LayoutDashboard,
    description: "Port KPI summary & metrics",
    roles: ["admin", "operations", "viewer"],
  },
  {
    name: "Operations Control",
    href: "/operations",
    icon: Compass,
    description: "Unified quayside control",
    roles: ["admin", "operations"],
  },
  {
    name: "Vessels",
    href: "/vessels",
    icon: Ship,
    description: "Fleet arrivals & anchorage",
    roles: ["admin", "operations"],
  },
  {
    name: "Berths",
    href: "/berths",
    icon: Anchor,
    description: "Terminal quay occupancy",
    roles: ["admin", "operations"],
  },
  {
    name: "Cranes",
    href: "/cranes",
    icon: Cpu,
    description: "STS gantry availability",
    roles: ["admin", "operations"],
  },
  {
    name: "Yard Capacity",
    href: "/yards",
    icon: Boxes,
    description: "Container stacking zones",
    roles: ["admin", "operations", "viewer"],
  },
  {
    name: "Optimization",
    href: "/optimization",
    icon: Zap,
    description: "72h CP-SAT schedule plan",
    roles: ["admin", "operations", "viewer"],
  },
  {
    name: "Disruptions",
    href: "/disruptions",
    icon: AlertTriangle,
    description: "Active impediments & logs",
    roles: ["admin", "operations", "viewer"],
  },
  {
    name: "Personnel & RBAC",
    href: "/users",
    icon: Users,
    description: "User directory & roles",
    roles: ["admin"],
    badge: "Admin",
  },
  {
    name: "Bob Copilot",
    href: "/copilot",
    icon: Bot,
    description: "Phase 2 AI assistant preview",
    roles: ["admin", "operations", "viewer"],
  },
];

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const role: UserRole = user?.role || "viewer";

  // Strictly filter navigation by the authenticated user's role
  const visibleNavItems = navItems.filter((item) => item.roles.includes(role));

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
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Navigation</span>
          <span className="text-[10px] text-slate-400 capitalize">{role} Scope</span>
        </div>
        {visibleNavItems.map((item) => {
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
              {item.badge && (
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>


      {/* Authenticated User Account Card */}
      <div className="border-t border-slate-200 bg-slate-50/80 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 truncate">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-2xs">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {user?.full_name || "Port Staff"}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {user?.email || "staff@naviops.port"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Sign Out of Session"
            className="rounded p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Real Role Status Badge */}
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Access Level:
          </span>
          {role === "admin" && (
            <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
              <ShieldCheck className="h-3 w-3 text-blue-600" />
              Port Manager (Admin)
            </span>
          )}
          {role === "operations" && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              <UserCheck className="h-3 w-3 text-emerald-600" />
              Operations Staff
            </span>
          )}
          {role === "viewer" && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              <Eye className="h-3 w-3 text-amber-600" />
              Viewer (Read-Only)
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
