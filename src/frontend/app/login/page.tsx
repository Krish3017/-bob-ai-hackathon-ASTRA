"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Anchor, ShieldCheck, UserCheck, Eye, Lock, Mail, User,
  Building, AlertCircle, ArrowRight, CheckCircle2
} from "lucide-react";
import { Button } from "@/design-system/button";
import { Badge } from "@/design-system/badge";
import { api, setAuthToken } from "@/lib/api";
import { UserRole } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");

  const [loginEmail, setLoginEmail] = useState("admin@naviops.port");
  const [loginPassword, setLoginPassword] = useState("admin123");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupDept, setSignupDept] = useState("Quayside Operations");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("naviops_token");
      if (token) router.replace("/");
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
      setTimeout(() => { window.location.href = "/"; }, 1000);
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-[#D5D9D3] bg-white px-3 py-2 pl-9 text-sm text-[#102A27] placeholder:text-[#899491] focus:border-[#004741] focus:outline-none focus:ring-1 focus:ring-[#004741] transition-colors";

  return (
    /*
     * Full-screen background layer.
     * Background image: /port-bg.jpg (place the port terminal photo in public/port-bg.jpg)
     * Falls back to a matching gradient derived from the image's cyan-sky + teal-water palette
     * when the image is not yet present.
     *
     * Overlay strategy (light, brand-aligned):
     *   - A thin sand/white gradient left-to-right preserves the image on the left
     *     while lightening the right panel area to keep the card readable
     *   - opacity kept low so the port image remains clearly visible
     */
    <div
      className="relative min-h-screen w-full overflow-x-hidden flex items-center justify-center"
      style={{
        backgroundImage:
          "url('/port-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "left center",
        backgroundRepeat: "no-repeat",
        /* Matching fallback gradient for the provided image's color palette:
           top: cyan sky (#A8DDE8 → #C9EDF3), bottom: deep teal water (#2F7D8C → #004741) */
        backgroundColor: "#7BCBD8",
      }}
    >
      {/*
       * Soft light overlay — Sand+White on the right, nearly transparent on the left.
       * Keeps the cranes and containers visible while making the card area bright.
       * NOT dark mode: uses sand #F0EDE4 and white, NOT dark grays.
       */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(105deg, rgba(240,237,228,0.18) 0%, rgba(240,237,228,0.30) 40%, rgba(250,250,248,0.55) 65%, rgba(250,250,248,0.72) 100%)",
        }}
      />

      {/*
       * Second subtle overlay — a very faint Cyprus tint over the lower portion
       * so the water/harbor area ties back to the brand color.
       */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent 50%, rgba(0,71,65,0.06) 100%)",
        }}
      />

      {/* ── Main Content ── */}
      <div className="relative z-10 w-full flex flex-col items-center px-4 py-10 sm:py-14">

        {/* ── Brand Header ── */}
        <div className="text-center mb-6">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white mb-4"
            style={{
              background: "#004741",
              boxShadow: "0 4px 20px rgba(0,71,65,0.35)",
            }}
          >
            <Anchor className="h-7 w-7" />
          </div>

          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: "#102A27", textShadow: "0 1px 3px rgba(255,255,255,0.7)" }}
          >
            NaviOps Port Operations
          </h1>
          <p
            className="text-xs sm:text-sm font-medium mt-1.5"
            style={{ color: "#2E4845", textShadow: "0 1px 2px rgba(255,255,255,0.6)" }}
          >
            Port Congestion Prediction &amp; Resource Schedule Optimizer
          </p>
        </div>

        {/* ── Authentication Card ── */}
        <div
          className="w-full max-w-md"
          style={{
            background: "rgba(255, 255, 255, 0.93)",
            border: "1px solid rgba(227,229,224,0.9)",
            borderRadius: "18px",
            boxShadow:
              "0 8px 32px rgba(0,71,65,0.12), 0 2px 8px rgba(0,71,65,0.08), 0 0 0 1px rgba(197,221,217,0.3)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div className="px-6 pt-6 pb-2 sm:px-8 sm:pt-7">

            {/* ── Tab Selector ── */}
            <div className="flex border-b border-[#E3E5E0] mb-6">
              <button
                type="button"
                onClick={() => { setTab("login"); setError(null); }}
                className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                  tab === "login"
                    ? "border-[#004741] text-[#004741]"
                    : "border-transparent text-[#899491] hover:text-[#5C6B68]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setTab("signup"); setError(null); }}
                className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${
                  tab === "signup"
                    ? "border-[#004741] text-[#004741]"
                    : "border-transparent text-[#899491] hover:text-[#5C6B68]"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* ── Feedback Messages ── */}
            {error && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#F2C4C3] bg-[#FCE9E8] p-3 text-xs text-[#B94A48]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#A8D9BC] bg-[#E5F2EA] p-3 text-xs text-[#2F7D5B]">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ════════════════════════════════ */}
            {/*          SIGN IN FORM           */}
            {/* ════════════════════════════════ */}
            {tab === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#102A27] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      placeholder="user@naviops.port"
                      className={inputClass}
                    />
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#899491]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#102A27] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className={inputClass}
                    />
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#899491]" />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In to NaviOps"}
                </Button>

                {/* ── Demo Personas ── */}
                <div className="pt-4 border-t border-[#F0EDE4]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#899491] mb-2">
                    1-Click Demo Personas:
                  </p>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleDemoFill("admin@naviops.port", "admin")}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl border border-[#E3E5E0] bg-[#F7F6F2] hover:bg-[#E1EFEC] hover:border-[#C5DDD9] transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E1EFEC]">
                          <ShieldCheck className="h-4 w-4 text-[#004741]" />
                        </div>
                        <div>
                          <span className="font-semibold text-[#102A27]">Port Manager (Admin)</span>
                          <span className="block text-[10px] text-[#899491]">admin@naviops.port · admin123</span>
                        </div>
                      </div>
                      <Badge variant="status" status="Available" size="sm">Full Access</Badge>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDemoFill("ops@naviops.port", "operations")}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl border border-[#E3E5E0] bg-[#F7F6F2] hover:bg-[#E1EFEC] hover:border-[#C5DDD9] transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E1F0F2]">
                          <UserCheck className="h-4 w-4 text-[#2F7D8C]" />
                        </div>
                        <div>
                          <span className="font-semibold text-[#102A27]">Operations Staff</span>
                          <span className="block text-[10px] text-[#899491]">ops@naviops.port · admin123</span>
                        </div>
                      </div>
                      <Badge variant="status" status="Normal" size="sm">Ops & Solver</Badge>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDemoFill("executive@naviops.port", "viewer")}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl border border-[#E3E5E0] bg-[#F7F6F2] hover:bg-[#FFF4DE] hover:border-[#F0D49A] transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFF4DE]">
                          <Eye className="h-4 w-4 text-[#C58A2B]" />
                        </div>
                        <div>
                          <span className="font-semibold text-[#102A27]">Executive / Viewer</span>
                          <span className="block text-[10px] text-[#899491]">executive@naviops.port · admin123</span>
                        </div>
                      </div>
                      <Badge variant="status" status="Near Capacity" size="sm">Read-Only</Badge>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ════════════════════════════════ */}
            {/*        CREATE ACCOUNT FORM      */}
            {/* ════════════════════════════════ */}
            {tab === "signup" && (
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#102A27] mb-1">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      placeholder="Capt. Sarah Jenkins"
                      className={inputClass}
                    />
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-[#899491]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#102A27] mb-1">Work Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      placeholder="s.jenkins@terminal.port"
                      className={inputClass}
                    />
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#899491]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#102A27] mb-1">Department</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={signupDept}
                      onChange={(e) => setSignupDept(e.target.value)}
                      placeholder="Quayside Operations / Harbor Control"
                      className={inputClass}
                    />
                    <Building className="absolute left-3 top-2.5 h-4 w-4 text-[#899491]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#102A27] mb-1">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className={inputClass}
                    />
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#899491]" />
                  </div>
                </div>

                <div className="rounded-xl border border-[#C5DDD9] bg-[#E1EFEC] p-2.5 text-[11px] text-[#004741]">
                  <span className="font-semibold">Security Role Policy:</span> All new signups receive the{" "}
                  <strong className="font-bold">Viewer (Read-Only)</strong> role. An administrator can elevate your access to Operations or Admin from the Users Directory.
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

            {/* ── Footer Link ── */}
            <div className="mt-5 pb-5 sm:pb-6 text-center">
              <Link
                href="/"
                className="text-xs text-[#5C6B68] hover:text-[#004741] font-medium inline-flex items-center gap-1 transition-colors"
              >
                Continue directly to Dashboard <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

          </div>
        </div>

        {/* ── Footer Tag ── */}
        <p
          className="mt-6 text-[11px] font-medium"
          style={{ color: "rgba(16,42,39,0.55)", textShadow: "0 1px 2px rgba(255,255,255,0.5)" }}
        >
          NaviOps © {new Date().getFullYear()} · Maritime Port Operations Platform
        </p>
      </div>
    </div>
  );
}
