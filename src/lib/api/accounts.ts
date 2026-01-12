import { jsonFetch } from "./client";
import { authHeaders, coerceDecimal } from "./utils";

export type Account = {
  _id: string;
  accountNumber: string;
  accountType: string;
  balance: number | { $numberDecimal: string };
  equity: number | { $numberDecimal: string };
  margin: number | { $numberDecimal: string };
  freeMargin: number | { $numberDecimal: string };
  marginLevel: number | { $numberDecimal: string };
  currency: string;
  leverage: number;
  status: string;
  statistics?: {
    openPositions?: number;
    totalProfitLoss?: number | { $numberDecimal: string };
    todayVolume?: number;
    pendingOrders?: number;
  };
};

export type AccountsResponse = {
  success: boolean;
  message: string;
  statusCode: number;
  timestamp: string;
  data: {
    summary: unknown;
    accounts: Account[];
  };
};

export async function getAccounts(status: string = "active") {
  const res = await jsonFetch<AccountsResponse>(`/api/v1/accounts?status=${encodeURIComponent(status)}`, {
    method: "GET",
    headers: authHeaders(),
  });
  return res.data.accounts.map((a) => ({
    ...a,
    balance: coerceDecimal(a.balance),
    equity: coerceDecimal(a.equity),
    margin: coerceDecimal(a.margin),
    freeMargin: coerceDecimal(a.freeMargin),
    marginLevel: coerceDecimal(a.marginLevel),
    statistics: a.statistics
      ? { ...a.statistics, totalProfitLoss: coerceDecimal(a.statistics.totalProfitLoss) }
      : undefined,
  }));
}

export async function getAccountsSummary(status: string = "active") {
  const res = await jsonFetch<AccountsResponse>(`/api/v1/accounts?status=${encodeURIComponent(status)}`, {
    method: "GET",
    headers: authHeaders(),
  });
  const summary = res.data.summary as any;
  const accounts = res.data.accounts.map((a) => ({
    ...a,
    balance: coerceDecimal(a.balance),
    equity: coerceDecimal(a.equity),
    margin: coerceDecimal(a.margin),
    freeMargin: coerceDecimal(a.freeMargin),
    marginLevel: coerceDecimal(a.marginLevel),
    statistics: a.statistics
      ? { ...a.statistics, totalProfitLoss: coerceDecimal(a.statistics.totalProfitLoss) }
      : undefined,
  }));
  return { summary, accounts };
}

export async function openAccount(payload: { accountType: string; currency: string; leverage: number }) {
  const res = await jsonFetch<{ data: any }>(`/api/v1/accounts`, {
    method: "POST",
    headers: authHeaders(),
    body: payload,
  });
  return res.data;
}
