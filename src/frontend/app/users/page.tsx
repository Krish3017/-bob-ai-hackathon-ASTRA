"use client";

import React, { useState, useEffect } from "react";
import { Users, ShieldCheck, UserCheck, Eye, ShieldAlert, CheckCircle2, Search, ArrowRight, UserPlus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/card";
import { Badge } from "@/design-system/badge";
import { Button } from "@/design-system/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/design-system/table";
import { api } from "@/lib/api";
import { User, UserRole } from "@/types";
import Link from "next/link";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>("admin");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [updateStatus, setUpdateStatus] = useState<{ [userId: string]: string }>({});
  const [error, setError] = useState<string | null>(null);

  const fetchUsersData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userList = await api.getUsers();
      setUsers(userList);
    } catch (err: any) {
      setError(err.message || "Failed to load personnel directory.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = (localStorage.getItem("naviops_role") as UserRole) || "admin";
      setCurrentRole(savedRole);
    }
    fetchUsersData();
  }, []);

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    setUpdateStatus((prev) => ({ ...prev, [userId]: "saving" }));
    try {
      const updated = await api.updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)));
      setUpdateStatus((prev) => ({ ...prev, [userId]: "saved" }));
      setTimeout(() => {
        setUpdateStatus((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }, 2000);

      // If user modified their own account
      const currentUserStr = localStorage.getItem("naviops_user");
      if (currentUserStr) {
        try {
          const current = JSON.parse(currentUserStr);
          if (current.id === userId) {
            localStorage.setItem("naviops_role", newRole);
            setCurrentRole(newRole as UserRole);
          }
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      alert("Failed to update role: " + err.message);
      setUpdateStatus((prev) => ({ ...prev, [userId]: "error" }));
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const adminCount = users.filter((u) => u.role === "admin").length;
  const opsCount = users.filter((u) => u.role === "operations").length;
  const viewerCount = users.filter((u) => u.role === "viewer").length;

  return (
    <AppShell
      title="Personnel & Role-Based Access Control"
      description="Manage port personnel directory, assign operational privileges, and review access levels."
      onRefresh={fetchUsersData}
      isRefreshing={isLoading}
      allowedRoles={["admin"]}
    >

      {/* Admin View */}
      {currentRole === "admin" && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border border-[#E3E5E0] bg-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5C6B68] uppercase tracking-wider">
                  Total Accounts
                </span>
                <Users className="h-4 w-4 text-[#899491]" />
              </div>
              <div className="mt-2 text-2xl font-bold text-[#102A27]">{users.length}</div>
              <div className="text-[11px] text-[#5C6B68] mt-0.5">Active directory records</div>
            </div>

            <div className="rounded-lg border border-[#E3E5E0] bg-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#004741] uppercase tracking-wider">
                  Port Managers
                </span>
                <ShieldCheck className="h-4 w-4 text-[#004741]" />
              </div>
              <div className="mt-2 text-2xl font-bold text-[#004741]">{adminCount}</div>
              <div className="text-[11px] text-[#5C6B68] mt-0.5">Full CRUD & Approval authority</div>
            </div>

            <div className="rounded-lg border border-[#E3E5E0] bg-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  Operations Staff
                </span>
                <UserCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-700">{opsCount}</div>
              <div className="text-[11px] text-[#5C6B68] mt-0.5">Control center & Solver run</div>
            </div>

            <div className="rounded-lg border border-[#E3E5E0] bg-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                  Viewers (Read-Only)
                </span>
                <Eye className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-700">{viewerCount}</div>
              <div className="text-[11px] text-[#5C6B68] mt-0.5">Executive & Stakeholder view</div>
            </div>
          </div>

          {/* Directory Filter & Search */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold text-[#102A27]">
                  Personnel Directory & Privilege Matrix
                </CardTitle>
                <p className="text-xs text-[#5C6B68] mt-0.5">
                  Promote new viewer signups to Operations or Administrator roles.
                </p>
              </div>
              <Link href="/login">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <UserPlus className="h-3.5 w-3.5" />
                  Sign Up New User
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by personnel name, email, or department..."
                    className="w-full rounded-lg border border-[#D5D9D3] px-3 py-2 pl-9 text-sm text-[#102A27] placeholder:text-[#899491] focus:border-[#004741] focus:outline-none focus:ring-1 focus:ring-[#004741]"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#899491]" />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-medium text-[#5C6B68] whitespace-nowrap">
                    Role Filter:
                  </span>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="rounded-lg border border-[#D5D9D3] bg-white px-3 py-2 text-xs font-medium text-[#5C6B68] focus:border-[#004741] focus:outline-none"
                  >
                    <option value="all">All Roles ({users.length})</option>
                    <option value="admin">Admin ({adminCount})</option>
                    <option value="operations">Operations ({opsCount})</option>
                    <option value="viewer">Viewer ({viewerCount})</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-lg border border-[#E3E5E0] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F7F6F2]/80">
                      <TableHead>User / Personnel</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead>Role Management (Admin Action)</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-[#899491] text-xs">
                          No personnel found matching the query.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => {
                        const isSaving = updateStatus[user.id] === "saving";
                        const isSaved = updateStatus[user.id] === "saved";

                        return (
                          <TableRow key={user.id} className="hover:bg-[#F7F6F2]/60 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0EDE4] text-xs font-bold text-[#5C6B68] border border-[#E3E5E0]">
                                  {user.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-[#102A27] text-sm">
                                    {user.full_name}
                                  </div>
                                  <div className="text-xs text-[#5C6B68]">{user.email}</div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-xs font-medium text-[#5C6B68]">
                              {user.department || "Port Operations"}
                            </TableCell>

                            <TableCell>
                              {user.role === "admin" && (
                                <Badge variant="status" status="Available" size="sm" className="gap-1 font-semibold">
                                  <ShieldCheck className="h-3 w-3 text-[#004741]" />
                                  Port Manager (Admin)
                                </Badge>
                              )}
                              {user.role === "operations" && (
                                <Badge variant="status" status="Normal" size="sm" className="gap-1 font-semibold">
                                  <UserCheck className="h-3 w-3 text-emerald-600" />
                                  Operations Staff
                                </Badge>
                              )}
                              {user.role === "viewer" && (
                                <Badge variant="status" status="Near Capacity" size="sm" className="gap-1 font-semibold">
                                  <Eye className="h-3 w-3 text-amber-600" />
                                  Viewer (Read-Only)
                                </Badge>
                              )}
                            </TableCell>


                            <TableCell>
                              <div className="flex items-center gap-2">
                                <select
                                  value={user.role}
                                  onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                  disabled={isSaving}
                                  className="rounded border border-[#D5D9D3] bg-white px-2.5 py-1 text-xs font-medium text-[#102A27] shadow-2xs hover:border-[#D5D9D3] focus:border-[#004741] focus:outline-none disabled:opacity-50"
                                >
                                  <option value="admin">Admin (Full Control)</option>
                                  <option value="operations">Operations Staff</option>
                                  <option value="viewer">Viewer (Read-Only)</option>
                                </select>

                                {isSaved && (
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Updated
                                  </span>
                                )}
                                {isSaving && (
                                  <span className="text-[11px] text-[#899491]">Saving...</span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-right">
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                Active
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* RBAC Policy Reference Card */}
              <div className="rounded-lg border border-[#E3E5E0] bg-[#F7F6F2]/70 p-4 mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5C6B68] mb-2">
                  Role Privileges Reference
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded border border-[#E3E5E0]">
                    <span className="font-semibold text-[#004741] flex items-center gap-1 mb-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Port Manager / Admin
                    </span>
                    <p className="text-[#5C6B68] text-[11px]">
                      Full system access. Create, edit, delete vessels, berths, cranes, yards, and disruptions. Approve and apply 72h optimization schedules. Manage users and roles.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded border border-[#E3E5E0]">
                    <span className="font-semibold text-emerald-700 flex items-center gap-1 mb-1">
                      <UserCheck className="h-3.5 w-3.5" /> Operations Staff
                    </span>
                    <p className="text-[#5C6B68] text-[11px]">
                      Quayside control. Register incoming vessels, log active disruptions, trigger OR-Tools optimization solver. Cannot delete critical records or approve final schedule plans.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded border border-[#E3E5E0]">
                    <span className="font-semibold text-amber-700 flex items-center gap-1 mb-1">
                      <Eye className="h-3.5 w-3.5" /> Viewer / Executive
                    </span>
                    <p className="text-[#5C6B68] text-[11px]">
                      Read-only access. Default role assigned upon public signup. Can view port KPIs, congestion indices, Gantt charts, and disruption logs without modification rights.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
