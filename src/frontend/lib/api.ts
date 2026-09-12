import {
  DashboardSummary,
  CongestionData,
  Vessel,
  Berth,
  Crane,
  Yard,
  Disruption,
  OptimizationRun,
  ScheduleItem,
  User,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let currentAuthToken = "admin@naviops.port";

export function setAuthToken(token: string) {
  currentAuthToken = token;
  if (typeof window !== "undefined") {
    localStorage.setItem("naviops_token", token);
  }
}

export function getAuthToken(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("naviops_token");
    if (saved) return saved;
  }
  return currentAuthToken;
}

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorDetail = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Auth
  getCurrentUser: () => fetchWithAuth<User>("/api/auth/me"),
  listUsers: () => fetchWithAuth<User[]>("/api/auth/users"),
  loginAs: (emailOrRole: string) =>
    fetchWithAuth<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: emailOrRole }),
    }),

  // Dashboard & Congestion
  getDashboardSummary: () => fetchWithAuth<DashboardSummary>("/api/dashboard/summary"),
  getCongestion: () => fetchWithAuth<CongestionData>("/api/dashboard/congestion"),
  resetDemoData: () => fetchWithAuth<{ status: string; message: string }>("/api/dashboard/reset-demo", { method: "POST" }),

  // Vessels
  getVessels: (status?: string) =>
    fetchWithAuth<Vessel[]>(`/api/vessels${status ? `?status=${status}` : ""}`),
  getVessel: (id: string) => fetchWithAuth<Vessel>(`/api/vessels/${id}`),
  createVessel: (data: Partial<Vessel>) =>
    fetchWithAuth<Vessel>("/api/vessels", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateVessel: (id: string, data: Partial<Vessel>) =>
    fetchWithAuth<Vessel>(`/api/vessels/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteVessel: (id: string) =>
    fetchWithAuth<void>(`/api/vessels/${id}`, {
      method: "DELETE",
    }),

  // Berths
  getBerths: () => fetchWithAuth<Berth[]>("/api/berths"),
  createBerth: (data: Partial<Berth>) =>
    fetchWithAuth<Berth>("/api/berths", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateBerth: (id: string, data: Partial<Berth>) =>
    fetchWithAuth<Berth>(`/api/berths/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteBerth: (id: string) =>
    fetchWithAuth<void>(`/api/berths/${id}`, {
      method: "DELETE",
    }),

  // Cranes
  getCranes: () => fetchWithAuth<Crane[]>("/api/cranes"),
  createCrane: (data: Partial<Crane>) =>
    fetchWithAuth<Crane>("/api/cranes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCrane: (id: string, data: Partial<Crane>) =>
    fetchWithAuth<Crane>(`/api/cranes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteCrane: (id: string) =>
    fetchWithAuth<void>(`/api/cranes/${id}`, {
      method: "DELETE",
    }),

  // Yards
  getYards: () => fetchWithAuth<Yard[]>("/api/yards"),
  updateYard: (id: string, data: Partial<Yard>) =>
    fetchWithAuth<Yard>(`/api/yards/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Disruptions
  getDisruptions: (status?: string) =>
    fetchWithAuth<Disruption[]>(`/api/disruptions${status ? `?status=${status}` : ""}`),
  createDisruption: (data: Partial<Disruption>) =>
    fetchWithAuth<Disruption>("/api/disruptions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateDisruption: (id: string, data: Partial<Disruption>) =>
    fetchWithAuth<Disruption>(`/api/disruptions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteDisruption: (id: string) =>
    fetchWithAuth<void>(`/api/disruptions/${id}`, {
      method: "DELETE",
    }),

  // Optimization
  runOptimization: () =>
    fetchWithAuth<OptimizationRun>("/api/optimization/run", {
      method: "POST",
    }),
  getLatestOptimizationRun: () =>
    fetchWithAuth<OptimizationRun>("/api/optimization/runs/latest"),
  listOptimizationRuns: () =>
    fetchWithAuth<OptimizationRun[]>("/api/optimization/runs"),
  applySchedule: (runId: string) =>
    fetchWithAuth<{ status: string; message: string }>("/api/optimization/apply", {
      method: "POST",
      body: JSON.stringify({ run_id: runId }),
    }),

  // Auth & Personnel Directory
  login: (email: string, password?: string, role?: string) =>
    fetchWithAuth<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: password || "admin123", role }),
    }),
  signup: (data: { email: string; password: string; full_name: string; department?: string }) =>
    fetchWithAuth<{ token: string; user: User }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getMe: () => fetchWithAuth<User>("/api/auth/me"),
  getUsers: () => fetchWithAuth<User[]>("/api/auth/users"),
  updateUserRole: (userId: string, role: string) =>
    fetchWithAuth<User>(`/api/auth/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),
};

