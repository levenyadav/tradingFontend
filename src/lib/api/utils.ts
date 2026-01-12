import { getAccessToken } from "../storage/session";

export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function coerceDecimal(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  if (typeof v === "object" && "$numberDecimal" in v) return Number(v.$numberDecimal);
  return Number(v);
}