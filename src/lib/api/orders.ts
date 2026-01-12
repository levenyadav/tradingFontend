import { jsonFetch, withAccount } from "./client";
import { authHeaders } from "./utils";

type OrdersListResponse = {
  data: Array<{
    id: string;
    symbol: string;
    type: string;
    direction: string;
    volume: number;
    status: string;
    createdAt: string;
  }>;
  meta: { page: number; limit: number; total: number; pages: number };
};

export async function getPendingOrdersCount(params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 50),
    status: "pending",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const scoped = withAccount<{ accountId?: string }>({}, false);
  if (scoped.accountId) query.set("accountId", scoped.accountId);
  const res = await jsonFetch<OrdersListResponse>(`/api/v1/orders?${query.toString()}`, {
    method: "GET",
    headers: authHeaders(),
  });
  return res.meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0);
}

export async function getPendingOrders(params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 50),
    status: "pending",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const scoped = withAccount<{ accountId?: string }>({}, false);
  if (scoped.accountId) query.set("accountId", scoped.accountId);
  const res = await jsonFetch<OrdersListResponse>(`/api/v1/orders?${query.toString()}`, {
    method: "GET",
    headers: authHeaders(),
  });
  return { items: res.data || [], meta: res.meta };
}

export type OrderRequest = {
  accountId: string;
  symbol: string;
  type: "market" | "limit" | "stop" | "stop_limit";
  direction: "buy" | "sell";
  volume: number;
  price?: number;
  stopPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;
  comment?: string;
};

export type OrderResponse = {
  success: boolean;
  data: any;
  message?: string;
};

export async function placeOrder(payload: OrderRequest) {
  const body = withAccount<OrderRequest>(payload, true);
  const res = await jsonFetch<OrderResponse>(`/api/v1/orders`, {
    method: "POST",
    headers: authHeaders(),
    body,
  });
  return res;
}

export async function cancelOrder(id: string) {
  const scoped = withAccount<{ accountId?: string }>({}, true);
  return jsonFetch(`/api/v1/orders/${id}/cancel`, {
    method: "POST",
    headers: authHeaders(),
    body: scoped,
  });
}
