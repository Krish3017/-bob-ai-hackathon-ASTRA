"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { UserRole } from "@/types";
import { setAuthToken } from "@/lib/api";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  congestionScore?: number;
  congestionLevel?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AppShell({
  children,
  title,
  description,
  congestionScore,
  congestionLevel,
  onRefresh,
  isRefreshing,
}: AppShellProps) {
  const [role, setRole] = useState<UserRole>("admin");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("naviops_role") as UserRole;
      if (savedRole) {
        setRole(savedRole);
      }
    }
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("naviops_role", newRole);
    }
    const tokenMap: Record<UserRole, string> = {
      admin: "admin@naviops.port",
      operations: "ops@naviops.port",
      viewer: "executive@naviops.port",
    };
    setAuthToken(tokenMap[newRole]);
    if (onRefresh) onRefresh();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Fixed Navigation Sidebar */}
      <Sidebar currentRole={role} onRoleChange={handleRoleChange} />

      {/* Main Content Area */}
      <div className="flex flex-col pl-64">
        <Header
          title={title}
          description={description}
          congestionScore={congestionScore}
          congestionLevel={congestionLevel}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
