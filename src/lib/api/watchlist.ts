import { jsonFetch } from "./client";
import { authHeaders, coerceDecimal } from "./utils";

export type WatchlistItem = {
  symbol: string;
  price: number;
  changePercent: number;
  alerts?: { priceAbove?: number; priceBelow?: number };
  addedAt?: string;
};

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const res = await jsonFetch<{ success: boolean; data: any }>("/api/v1/market/watchlist", {
    method: "GET",
    headers: authHeaders(),
  });
  const arr = Array.isArray(res?.data) ? res.data : [];
  return arr.map((i: any) => ({
    symbol: i.symbol,
    price: coerceDecimal(i.price),
    changePercent: coerceDecimal(i.changePercent),
    alerts: i.alerts,
    addedAt: i.addedAt,
  }));
}

export async function addWatchlistSymbol(symbol: string, alerts?: { priceAbove?: number; priceBelow?: number }) {
  const normalized = symbol.toUpperCase();
  const res = await jsonFetch<{ success: boolean; data: any }>("/api/v1/market/watchlist", {
    method: "POST",
    headers: authHeaders(),
    body: { symbol: normalized, alerts: alerts || { priceAbove: 0, priceBelow: 0 } },
  });
  return res.data as WatchlistItem;
}

export async function removeWatchlistSymbol(symbol: string) {
  const normalized = encodeURIComponent(symbol.toUpperCase());
  const res = await jsonFetch<{ success: boolean; data: any }>(`/api/v1/market/watchlist/${normalized}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return res.data as { symbol: string; removedAt: string };
}

