"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Compass,
  Ship,
  Anchor,
  Cpu,
  Boxes,
  Zap,
  AlertTriangle,
  Bot,
  Users,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Eye,
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
  roles: UserRole[];
  badge?: string;
  children?: { name: string; href: string; icon: any }[];
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const role: UserRole = user?.role || "viewer";

  const isAssetsActive =
    pathname.startsWith("/vessels") ||
    pathname.startsWith("/berths") ||
    pathname.startsWith("/cranes") ||
    pathname.startsWith("/yards");

  const [assetsOpen, setAssetsOpen] = useState(isAssetsActive);

  // Grouped navigation structure
  const mainNavItems: NavItem[] = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      roles: ["admin", "operations", "viewer"],
    },
    {
      name: "Operations",
      href: "/operations",
      icon: Compass,
      roles: ["admin", "operations"],
    },
    {
      name: "Assets",
      href: "/vessels",
      icon: Ship,
      roles: ["admin", "operations", "viewer"],
      children: [
        { name: "Vessels Fleet", href: "/vessels", icon: Ship },
        { name: "Quay Berths", href: "/berths", icon: Anchor },
        { name: "STS Cranes", href: "/cranes", icon: Cpu },
        { name: "Yard Zones", href: "/yards", icon: Boxes },
      ],
    },
    {
      name: "Optimization",
      href: "/optimization",
      icon: Zap,
      roles: ["admin", "operations", "viewer"],
    },
    {
      name: "Disruptions",
      href: "/disruptions",
      icon: AlertTriangle,
      roles: ["admin", "operations", "viewer"],
    },
    {
      name: "Bob Copilot",
      href: "/copilot",
      icon: Bot,
      roles: ["admin", "operations", "viewer"],
    },
  ];

  const adminNavItems: NavItem[] = [
    {
      name: "Users",
      href: "/users",
      icon: Users,
      roles: ["admin"],
    },
  ];

  const visibleMainItems = mainNavItems.filter((item) => item.roles.includes(role));
  const visibleAdminItems = adminNavItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b border-slate-100 px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white shadow-2xs">
            <Anchor className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-900">
            NaviOps
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            Port
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Main Section */}
        <div>
          <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Main
          </div>
          <nav className="space-y-0.5">
            {visibleMainItems.map((item) => {
              const Icon = item.icon;

              if (item.children) {
                const isCurrentActive = isAssetsActive;
                return (
                  <div key={item.name} className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => setAssetsOpen(!assetsOpen)}
                      className={cn(
                        "group flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        isCurrentActive
                          ? "bg-slate-100 text-slate-900 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isCurrentActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {assetsOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>

                    {assetsOpen && (
                      <div className="pl-6 pr-1 space-y-0.5">
                        {item.children.map((child) => {
                          const isChildActive = pathname === child.href;
                          const ChildIcon = child.icon;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                                isChildActive
                                  ? "bg-blue-50 text-blue-700 font-semibold"
                                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                              )}
                            >
                              <ChildIcon
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0",
                                  isChildActive ? "text-blue-600" : "text-slate-400"
                                )}
                              />
                              <span className="truncate">{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Administration Section */}
        {visibleAdminItems.length > 0 && (
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Administration
            </div>
            <nav className="space-y-0.5">
              {visibleAdminItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Footer Strip */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {user?.full_name || "User"}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">
                {role === "admin" ? "Port Admin" : role === "operations" ? "Ops Staff" : "Viewer"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
