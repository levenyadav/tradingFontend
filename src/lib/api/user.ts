import { jsonFetch } from "./client";
import { authHeaders } from "./utils";

export type MeResponse = {
  success: boolean;
  message: string;
  statusCode: number;
  timestamp: string;
  data: {
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      status?: string;
      kycStatus?: 'pending' | 'in_review' | 'verified' | 'rejected' | string;
      notifications?: Record<string, boolean>;
      walletBalance?: number;
      timezone?: string;
      language?: string;
    };
  };
};

let meCache: { value: any; ts: number } | null = null;
let meInFlight: Promise<any> | null = null;

export async function getMe() {
  const now = Date.now();
  if (meCache && (now - meCache.ts) < 10_000) return meCache.value;
  if (meInFlight) return meInFlight;
  meInFlight = (async () => {
    const res = await jsonFetch<MeResponse>("/api/v1/auth/me", {
      method: "GET",
      headers: authHeaders(),
    });
    meCache = { value: res.data.user, ts: Date.now() };
    meInFlight = null;
    return res.data.user;
  })();
  return meInFlight;
}

export type NotificationsResponse = {
  notifications: Array<{
    id: string;
    userId: string;
    type: string;
    data?: { title?: string; message?: string };
    title?: string;
    message?: string;
    priority?: string;
    timestamp?: string;
    createdAt?: string;
    read?: boolean;
  }>;
  pagination: { total: number };
};

export async function getNotifications(params: { page?: number; limit?: number; unreadOnly?: boolean } = {}) {
  const qp = new URLSearchParams();
  if (params.page) qp.set("page", String(params.page));
  if (params.limit) qp.set("limit", String(params.limit));
  if (typeof params.unreadOnly === "boolean") qp.set("unreadOnly", params.unreadOnly ? "true" : "false");
  const res = await jsonFetch<{ data: NotificationsResponse }>(`/api/v1/users/notifications?${qp.toString()}`, {
    method: "GET",
    headers: authHeaders(),
  });
  return res.data.notifications;
}
