import { jsonFetch, withAccount } from "./client";
import { authHeaders, coerceDecimal } from "./utils";
import { validateAndFixPositions } from "../position-fix";

export type PositionItem = {
  id?: string;
  _id?: string;
  positionId?: string;
  account?: { id: string; accountNumber: string; currency: string };
  accountId?: { _id: string; accountNumber: string; currency: string };
  symbol: string;
  direction: "buy" | "sell" | string;
  volume: number;
  openPrice: number | { $numberDecimal: string };
  currentPrice: number | { $numberDecimal?: string };
  closePrice?: number | { $numberDecimal?: string };
  profitLoss?: number | { $numberDecimal: string };
  unrealizedPL?: number | { $numberDecimal: string };
  commission?: number | { $numberDecimal: string };
  swap?: number | { $numberDecimal: string };
  margin?: number | { $numberDecimal: string };
  pips?: number | { $numberDecimal: string };
  unrealizedPLPercent?: number | string;
  openedAt: string;
  closedAt?: string;
  status?: string;
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;
};

export type PositionsResponse = {
  success: boolean;
  message: string;
  statusCode: number;
  timestamp: string;
  data: { positions: PositionItem[] };
};

export async function getPositions(params: { page?: number; limit?: number; sortBy?: string; sortOrder?: string } = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
    sortBy: params.sortBy ?? "createdAt",
    sortOrder: params.sortOrder ?? "desc",
  });
  const scoped = withAccount<{ accountId?: string }>({}, false);
  if (scoped.accountId) query.set("accountId", scoped.accountId);
  const res = await jsonFetch<PositionsResponse>(`/api/v1/positions?${query.toString()}`, {
    method: "GET",
    headers: authHeaders(),
  });
  
  const positions = res.data.positions.map((p) => {
    const account = p.account
      ? p.account
      : p.accountId
      ? { id: p.accountId._id, accountNumber: p.accountId.accountNumber, currency: p.accountId.currency }
      : undefined;
    return {
      id: p.id || p._id,
      positionId: (p as any).positionId,
      symbol: p.symbol,
      direction: p.direction,
      volume: p.volume,
      account,
      openPrice: coerceDecimal(p.openPrice),
      currentPrice: coerceDecimal(p.currentPrice),
      closePrice: coerceDecimal((p as any).closePrice),
      profitLoss: coerceDecimal(p.profitLoss),
      unrealizedPL: coerceDecimal(p.unrealizedPL),
      commission: coerceDecimal(p.commission),
      swap: coerceDecimal(p.swap),
      margin: coerceDecimal(p.margin),
      pips: coerceDecimal(p.pips),
      unrealizedPLPercent: typeof p.unrealizedPLPercent === 'string' ? Number(p.unrealizedPLPercent) : coerceDecimal(p.unrealizedPLPercent),
      openedAt: p.openedAt,
      status: p.status,
    } as PositionItem;
  });
  
  // 🚨 FIX: Validate and correct position calculations
  return validateAndFixPositions(positions);
}

export async function getPositionsHistory(params: { page?: number; limit?: number; sortBy?: string; sortOrder?: string } = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
    sortBy: params.sortBy ?? "closedAt",
    sortOrder: params.sortOrder ?? "desc",
  });
  const scoped = withAccount<{ accountId?: string }>({}, false);
  if (scoped.accountId) query.set("accountId", scoped.accountId);
  const res = await jsonFetch<PositionsResponse>(`/api/v1/positions/history?${query.toString()}`, {
    method: "GET",
    headers: authHeaders(),
  });
  return res.data.positions.map((p) => {
    const account = p.account
      ? p.account
      : p.accountId
      ? { id: p.accountId._id, accountNumber: p.accountId.accountNumber, currency: p.accountId.currency }
      : undefined;
    return {
      id: p.id || p._id,
      symbol: p.symbol,
      direction: p.direction,
      volume: p.volume,
      account,
      openPrice: coerceDecimal(p.openPrice),
      currentPrice: coerceDecimal(p.currentPrice),
      closePrice: coerceDecimal((p as any).closePrice),
      profitLoss: coerceDecimal(p.profitLoss),
      unrealizedPL: coerceDecimal(p.unrealizedPL),
      commission: coerceDecimal(p.commission),
      swap: coerceDecimal(p.swap),
      margin: coerceDecimal(p.margin),
      pips: coerceDecimal(p.pips),
      unrealizedPLPercent: typeof p.unrealizedPLPercent === 'string' ? Number(p.unrealizedPLPercent) : coerceDecimal(p.unrealizedPLPercent),
      openedAt: p.openedAt,
      closedAt: (p as any).closedAt,
      status: p.status,
    } as PositionItem;
  });
}

export async function getPositionsPage(params: { page?: number; limit?: number; sortBy?: string; sortOrder?: string; symbol?: string } = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
    sortBy: params.sortBy ?? "createdAt",
    sortOrder: params.sortOrder ?? "desc",
    ...(params.symbol ? { symbol: params.symbol } : {}),
  });
  const scoped = withAccount<{ accountId?: string }>({}, false);
  if (scoped.accountId) query.set("accountId", scoped.accountId);
  const res = await jsonFetch<{ data: { positions: PositionItem[]; pagination?: any; summary?: any } }>(`/api/v1/positions?${query.toString()}`, {
    method: "GET",
    headers: authHeaders(),
  });
  const items = (res.data?.positions || []).map((p) => {
    const account = (p as any).account
      ? (p as any).account
      : (p as any).accountId
      ? { id: (p as any).accountId._id, accountNumber: (p as any).accountId.accountNumber, currency: (p as any).accountId.currency }
      : undefined;
    return {
      id: (p as any).id || (p as any)._id,
      positionId: (p as any).positionId,
      symbol: (p as any).symbol,
      direction: (p as any).direction,
      volume: (p as any).volume,
      account,
      openPrice: coerceDecimal((p as any).openPrice),
      currentPrice: coerceDecimal((p as any).currentPrice),
      closePrice: coerceDecimal((p as any).closePrice),
      unrealizedPL: coerceDecimal((p as any).unrealizedPL),
      commission: coerceDecimal((p as any).commission),
      swap: coerceDecimal((p as any).swap),
      margin: coerceDecimal((p as any).margin),
      pips: coerceDecimal((p as any).pips),
      unrealizedPLPercent: typeof (p as any).unrealizedPLPercent === 'string' ? Number((p as any).unrealizedPLPercent) : coerceDecimal((p as any).unrealizedPLPercent),
      stopLoss: coerceDecimal((p as any).stopLoss),
      takeProfit: coerceDecimal((p as any).takeProfit),
      trailingStop: coerceDecimal((p as any).trailingStop),
      openedAt: (p as any).openedAt,
      status: (p as any).status,
    } as PositionItem;
  });
  const fixed = validateAndFixPositions(items as PositionItem[]);
  return { items: fixed, pagination: res.data?.pagination, summary: res.data?.summary };
}

export type PositionDetailDTO = {
  id: string;
  account: { id: string; accountNumber: string; currency: string };
  symbol: string;
  direction: "buy" | "sell" | string;
  volume: number;
  openPrice: number;
  currentPrice: number;
  pips: number;
  unrealizedPL: number;
  margin: number;
  status: string;
  openedAt: string;
  updatedAt: string;
  orders: Array<{ type: string; side: string; price: number; status: string; createdAt: string }>;
  costs: { commission: number; swap: number; spread: number; total: number };
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;
};

export async function getPositionDetail(id: string): Promise<PositionDetailDTO> {
  const res = await jsonFetch<{ data: { position: any } }>(`/api/v1/positions/${id}`, {
    method: "GET",
    headers: authHeaders(),
  });
  const p = res?.data?.position || {};
  const toNum = (v: any) => coerceDecimal(v);
  return {
    id: String(p.id || p._id || id),
    account: {
      id: String(p.account?.id || p.accountId?._id || ""),
      accountNumber: String(p.account?.accountNumber || p.accountId?.accountNumber || ""),
      currency: String(p.account?.currency || p.accountId?.currency || "USD"),
    },
    symbol: String(p.symbol || ""),
    direction: String(p.direction || ""),
    volume: toNum(p.volume),
    openPrice: toNum(p.openPrice),
    currentPrice: toNum(p.currentPrice),
    pips: toNum(p.pips),
    unrealizedPL: toNum(p.unrealizedPL),
    margin: toNum(p.margin),
    status: String(p.status || ""),
    openedAt: String(p.openedAt || ""),
    updatedAt: String(p.updatedAt || ""),
    orders: Array.isArray(p.orders) ? p.orders.map((o: any) => ({
      type: String(o.type || ""),
      side: String(o.side || ""),
      price: toNum(o.price),
      status: String(o.status || ""),
      createdAt: String(o.createdAt || ""),
    })) : [],
    costs: (() => {
      const commission = toNum(p.costs?.commission ?? p.commission) || 0;
      const swap = toNum(p.costs?.swap ?? p.swap) || 0;
      const spread = toNum(p.costs?.spread ?? p.spread) || 0;
      const totalRaw = toNum(p.costs?.total ?? p.totalCosts);
      const total = typeof totalRaw === 'number' && !isNaN(totalRaw) ? totalRaw : commission + swap + spread;
      return { commission, swap, spread, total };
    })(),
    stopLoss: toNum((p as any).stopLoss),
    takeProfit: toNum((p as any).takeProfit ?? (p as any).tp),
    trailingStop: toNum((p as any).trailingStop ?? (p as any).ts),
  };
}

export async function closePosition(id: string, payload: { volume: number; price?: number; reason?: string }) {
  const body = withAccount<{ volume: number; price?: number; reason?: string; accountId?: string }>({
    volume: payload.volume,
    price: payload.price ?? 0,
    reason: payload.reason ?? "manual",
  }, true);
  return jsonFetch(`/api/v1/positions/${id}/close`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body,
  });
}

export async function modifyPosition(id: string, payload: { stopLoss?: number; takeProfit?: number; trailingStop?: number }) {
  const body: Record<string, number> = {};
  if (typeof payload.stopLoss === 'number') body.stopLoss = payload.stopLoss;
  if (typeof payload.takeProfit === 'number') body.takeProfit = payload.takeProfit;
  if (typeof payload.trailingStop === 'number') body.trailingStop = payload.trailingStop;
  const scoped = withAccount<typeof body & { accountId?: string }>(body, true);
  return jsonFetch(`/api/v1/positions/${id}/modify`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: scoped,
  });
}
