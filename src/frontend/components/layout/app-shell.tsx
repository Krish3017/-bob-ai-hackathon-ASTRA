"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { User, UserRole } from "@/types";
import { api } from "@/lib/api";
import { Anchor, ShieldAlert, ArrowLeft, LogOut } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  congestionScore?: number;
  congestionLevel?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  allowedRoles?: UserRole[];
}

export function AppShell({
  children,
  title,
  description,
  congestionScore,
  congestionLevel,
  onRefresh,
  isRefreshing,
  allowedRoles,
}: AppShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("naviops_token");
    if (!token) {
      // Force redirect to login page if no token exists
      router.replace("/login");
      return;
    }

    // Attempt to parse cached user
    const cachedUser = localStorage.getItem("naviops_user");
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setUser(parsed);
        setIsLoadingAuth(false);
        return;
      } catch {
        // Continue to verify
      }
    }

    // Verify token with backend
    api.getMe()
      .then((userData) => {
        setUser(userData);
        localStorage.setItem("naviops_user", JSON.stringify(userData));
        localStorage.setItem("naviops_role", userData.role);
        setIsLoadingAuth(false);
      })
      .catch((err) => {
        console.warn("Session validation failed, redirecting to login:", err);
        localStorage.removeItem("naviops_token");
        localStorage.removeItem("naviops_user");
        localStorage.removeItem("naviops_role");
        router.replace("/login");
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("naviops_token");
    localStorage.removeItem("naviops_user");
    localStorage.removeItem("naviops_role");
    router.replace("/login");
  };

  // Prevent flash of protected dashboard content before authentication check completes
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm animate-pulse mb-3">
          <Anchor className="h-6 w-6" />
        </div>
        <div className="text-sm font-semibold text-slate-800">
          Authenticating NaviOps Session...
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Verifying security credentials and access permissions
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar user={user} onLogout={handleLogout} />

      {/* Main Content Area */}
      <div className="flex flex-col pl-64">
        <Header
          title={title}
          description={description}
          congestionScore={congestionScore}
          congestionLevel={congestionLevel}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          user={user}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {allowedRoles && user && !allowedRoles.includes(user.role) ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 md:p-12 shadow-sm text-center max-w-2xl mx-auto my-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-xs mb-4">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Access Restricted
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                This page requires{" "}
                <span className="font-semibold text-slate-800">
                  {allowedRoles
                    .map((r) =>
                      r === "admin"
                        ? "Port Manager / Admin"
                        : r === "operations"
                        ? "Operations Staff"
                        : "Viewer"
                    )
                    .join(" or ")}
                </span>{" "}
                privileges.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3.5 py-1.5 text-xs text-slate-700">
                <span>Authenticated Role:</span>
                <span className="font-bold uppercase tracking-wider text-blue-700">
                  {user.role}
                </span>
                <span className="text-slate-400">({user.email})</span>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Return to Overview
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-slate-400" />
                  Sign In with Different Account
                </button>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
