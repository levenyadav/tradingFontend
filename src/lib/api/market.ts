import { jsonFetch } from "./client";
import { authHeaders, coerceDecimal } from "./utils";

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export async function getCandles(symbol: string, timeframe: string = "5m", limit: number = 100): Promise<Candle[]> {
  const s = encodeURIComponent(symbol.toUpperCase());
  const res = await jsonFetch<{ data: { candles: any[] } }>(`/api/v1/market/candles/${s}?timeframe=${timeframe}&limit=${limit}`, {
    method: "GET",
    headers: authHeaders(),
  });
  const arr = res.data?.candles ?? [];
  return arr.map((c: any) => ({
    time: Math.floor(Number(c.time) / 1000),
    open: coerceDecimal(c.open),
    high: coerceDecimal(c.high),
    low: coerceDecimal(c.low),
    close: coerceDecimal(c.close),
    volume: coerceDecimal(c.volume),
  }));
}

