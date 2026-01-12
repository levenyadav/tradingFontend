import { jsonFetchWithRetry } from "./client";
import { authHeaders, coerceDecimal } from "./utils";
import type { CurrencyPair } from "../../types";

type OverviewItem = {
  symbol: string;
  category?: string;
  price: number | string | { $numberDecimal: string };
  changePercent: number | string | { $numberDecimal: string };
  volume24h?: number | string | { $numberDecimal: string };
  high24h?: number | string | { $numberDecimal: string };
  low24h?: number | string | { $numberDecimal: string };
};

type MarketOverviewResponse = {
  success?: boolean;
  message?: string;
  statusCode?: number;
  timestamp?: string;
  data?: {
    timestamp: string;
    totalPairs: number;
    overview: OverviewItem[];
  };
};

function mapCategory(symbol: string, backendCategory?: string): CurrencyPair["category"] {
  const s = symbol.toUpperCase();
  if (s.includes("BTC")) return "crypto";
  return "forex";
}

export async function getMarketOverview(): Promise<CurrencyPair[]> {
  const res = await jsonFetchWithRetry<MarketOverviewResponse>("/api/v1/market/overview", {
    method: "GET",
    headers: authHeaders(),
  }, 3, 250);
  const items = res?.data?.overview || [];
  return items.map((i) => {
    const symbol = (i.symbol || "").toUpperCase();
    const price = coerceDecimal(i.price);
    return {
      pair: symbol,
      name: symbol,
      bidPrice: price,
      askPrice: price,
      spread: 0,
      change24h: 0,
      changePercent24h: coerceDecimal(i.changePercent),
      high24h: coerceDecimal(i.high24h),
      low24h: coerceDecimal(i.low24h),
      volume: coerceDecimal(i.volume24h),
      category: mapCategory(symbol, i.category),
      isFavorite: false,
    } as CurrencyPair;
  });
}
