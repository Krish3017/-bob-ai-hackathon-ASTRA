"use client";

import React, { useState, useEffect } from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Anchor, ShieldCheck, UserCheck, Eye, Lock, Mail, User, Building, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/design-system/button";
import { Badge } from "@/design-system/badge";
import { FormField } from "@/design-system/form-field";
import { api, setAuthToken } from "@/lib/api";
import { UserRole } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState("admin@naviops.port");
  const [loginPassword, setLoginPassword] = useState("admin123");
  
  // Signup fields
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupDept, setSignupDept] = useState("Quayside Operations");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already authenticated, redirect straight to dashboard
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("naviops_token");
      if (token) {
        router.replace("/");
      }
    }
  }, [router]);

  const handleDemoFill = async (email: string, role: UserRole) => {
    setLoginEmail(email);
    setLoginPassword("admin123");
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.login(email, "admin123", role);
      setAuthToken(res.token);
      localStorage.setItem("naviops_token", res.token);
      localStorage.setItem("naviops_role", res.user.role);
      localStorage.setItem("naviops_user", JSON.stringify(res.user));
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Failed to log in with demo account");
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError("Please enter both email and password.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.login(loginEmail, loginPassword);
      setAuthToken(res.token);
      localStorage.setItem("naviops_token", res.token);
      localStorage.setItem("naviops_role", res.user.role);
      localStorage.setItem("naviops_user", JSON.stringify(res.user));
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Login failed. Please verify credentials.");
      setIsLoading(false);
    }
  };


  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPassword) {
      setError("Please fill out all required fields.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.signup({
        full_name: signupName,
        email: signupEmail,
        password: signupPassword,
        department: signupDept,
      });
      setAuthToken(res.token);
      localStorage.setItem("naviops_token", res.token);
      localStorage.setItem("naviops_role", res.user.role);
      localStorage.setItem("naviops_user", JSON.stringify(res.user));
      setSuccessMsg("Account successfully created as Viewer (Read-Only). Redirecting to port overview...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);

    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm mb-3">
          <Anchor className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          NaviOps Port Operations
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Port Congestion Prediction & Resource Schedule Optimizer
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {/* Tab Selection */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => { setTab("login"); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                tab === "login"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab("signup"); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                tab === "signup"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Tab 1: Sign In Form */}
          {tab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    placeholder="user@naviops.port"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center mt-2"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In with JWT"}
              </Button>

              {/* Quick Demo Fill Buttons */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  1-Click Demo Personas:
                </p>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleDemoFill("admin@naviops.port", "admin")}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      <div>
                        <span className="font-semibold text-slate-900">Port Manager (Admin)</span>
                        <span className="block text-[10px] text-slate-500">admin@naviops.port · admin123</span>
                      </div>
                    </div>
                    <Badge variant="status" status="Available" size="sm">Full Access</Badge>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoFill("ops@naviops.port", "operations")}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                      <div>
                        <span className="font-semibold text-slate-900">Operations Staff</span>
                        <span className="block text-[10px] text-slate-500">ops@naviops.port · admin123</span>
                      </div>
                    </div>
                    <Badge variant="status" status="Normal" size="sm">Ops & Solver</Badge>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoFill("executive@naviops.port", "viewer")}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-amber-600" />
                      <div>
                        <span className="font-semibold text-slate-900">Executive / Viewer</span>
                        <span className="block text-[10px] text-slate-500">executive@naviops.port · admin123</span>
                      </div>
                    </div>
                    <Badge variant="status" status="Near Capacity" size="sm">Read-Only</Badge>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Tab 2: Sign Up Form */}
          {tab === "signup" && (
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                    placeholder="Capt. Sarah Jenkins"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    placeholder="s.jenkins@terminal.port"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={signupDept}
                    onChange={(e) => setSignupDept(e.target.value)}
                    placeholder="Quayside Operations / Harbor Control"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Building className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* RBAC Notice */}
              <div className="rounded-md border border-blue-200 bg-blue-50/70 p-2.5 text-[11px] text-blue-800">
                <span className="font-semibold">Security Role Policy:</span> All new signups receive the <strong className="font-bold">Viewer (Read-Only)</strong> role. An administrator can elevate your access to Operations or Admin from the Users Directory.
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center mt-2"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account & Sign In"}
              </Button>
            </form>
          )}

          <div className="mt-5 text-center">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1"
            >
              Continue directly to Dashboard <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
