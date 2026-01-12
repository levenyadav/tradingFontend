import { jsonFetchWithRetry } from "./client";
import { authHeaders, coerceDecimal } from "./utils";

export type TransactionsResponse = {
  data: { transactions: any[] };
};

export type WalletTxn = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  netAmount: number;
  status: 'completed' | 'pending' | 'failed' | 'cancelled' | 'expired';
  createdAt: string;
  accountNumber?: string;
  symbol?: string;
  volume?: number;
  price?: number;
  documentCount?: number;
};

export async function getTransactions(params: { page?: number; limit?: number; sortBy?: string; sortOrder?: string } = {}): Promise<WalletTxn[]> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 50),
    sortBy: params.sortBy ?? 'createdAt',
    sortOrder: params.sortOrder ?? 'desc',
  });
  const res = await jsonFetchWithRetry<TransactionsResponse>(`/api/v1/wallet/transactions?${query.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  }, 2, 250);
  const items = res.data?.transactions ?? [];
  return items.map((t: any) => {
    const status = t.status
      || (t.isCompleted ? 'completed'
      : t.isPending ? 'pending'
      : t.isFailed ? 'failed'
      : t.isCancelled ? 'cancelled'
      : t.isExpired ? 'expired'
      : 'completed');
    const amount = coerceDecimal(t.amountInUSD ?? t.amount);
    const fee = coerceDecimal(t.feeInUSD ?? t.fee);
    const netAmount = amount - (fee || 0);
    return {
      id: t.id || t._id || t.transactionId,
      type: String(t.type || 'trade'),
      amount,
      currency: String(t.currency || (t.accountId?.currency ?? 'USD')),
      netAmount,
      status,
      createdAt: String(t.createdAt),
      accountNumber: t.accountId?.accountNumber,
      symbol: t.metadata?.symbol,
      volume: coerceDecimal(t.metadata?.volume),
      price: coerceDecimal(t.metadata?.price),
      documentCount: coerceDecimal(t.documentCount),
    } as WalletTxn;
  });
}

export type TransactionsMetaResponse = {
  data: {
    transactions: any[];
    pagination?: { page: number; limit: number; total: number; pages: number };
    summary?: any;
  };
};

export async function getTransactionsWithMeta(params: { page?: number; limit?: number; sortBy?: string; sortOrder?: string; type?: string; status?: string; startDate?: string; endDate?: string } = {}): Promise<{ items: WalletTxn[]; pagination?: { page: number; limit: number; total: number; pages: number }; summary?: any }> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 25),
    sortBy: params.sortBy ?? 'createdAt',
    sortOrder: params.sortOrder ?? 'desc',
  });
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  const res = await jsonFetchWithRetry<TransactionsMetaResponse>(`/api/v1/wallet/transactions?${query.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  }, 2, 250);
  const raw = res.data || ({} as any);
  const items = (raw.transactions || []).map((t: any) => {
    const status = t.status
      || (t.isCompleted ? 'completed'
      : t.isPending ? 'pending'
      : t.isFailed ? 'failed'
      : t.isCancelled ? 'cancelled'
      : t.isExpired ? 'expired'
      : 'completed');
    const amount = coerceDecimal(t.amountInUSD ?? t.amount);
    const fee = coerceDecimal(t.feeInUSD ?? t.fee);
    const netAmount = amount - (fee || 0);
    return {
      id: t.id || t._id || t.transactionId,
      type: String(t.type || 'trade'),
      amount,
      currency: String(t.currency || (t.accountId?.currency ?? 'USD')),
      netAmount,
      status,
      createdAt: String(t.createdAt),
      accountNumber: t.accountId?.accountNumber,
      symbol: t.metadata?.symbol,
      volume: coerceDecimal(t.metadata?.volume),
      price: coerceDecimal(t.metadata?.price),
      documentCount: coerceDecimal(t.documentCount),
    } as WalletTxn;
  });
  return { items, pagination: raw.pagination, summary: raw.summary };
}
