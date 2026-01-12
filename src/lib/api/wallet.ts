import { jsonFetch } from "./client";
import { authHeaders, coerceDecimal } from "./utils";

export type WalletBalance = {
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingTransactions: number;
  availableToTransfer: number;
};

export async function getWalletBalance(): Promise<WalletBalance> {
  const res = await jsonFetch<{ data: any }>("/api/v1/wallet/balance", {
    method: "GET",
    headers: authHeaders(),
  });
  const d = res.data || {};
  return {
    balance: coerceDecimal(d.balance),
    totalDeposits: coerceDecimal(d.totalDeposits),
    totalWithdrawals: coerceDecimal(d.totalWithdrawals),
    pendingTransactions: coerceDecimal(d.pendingTransactions),
    availableToTransfer: coerceDecimal(d.availableToTransfer),
  };
}

export async function transferToAccount(payload: { accountId: string; amount: number; reason?: string }) {
  const res = await jsonFetch<{ data: any }>("/api/v1/wallet/transfer-to-account", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function transferFromAccount(payload: { accountId: string; amount: number; reason?: string }) {
  const res = await jsonFetch<{ data: any }>("/api/v1/wallet/transfer-from-account", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return res.data;
}
