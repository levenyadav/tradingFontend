const DEFAULT_BASE_URL = "https://api.novapip.io";

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || DEFAULT_BASE_URL;

type JsonFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
};

function buildURL(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${normalized}`;
}

import { getAccessToken, getRefreshToken, saveSession, clearSession, getSessionId } from "../storage/session";
import { refreshTokens } from "./auth";

export async function jsonFetch<T>(path: string, options: JsonFetchOptions = {}): Promise<T> {
  const { method = "GET", headers = {}, body, signal } = options;

  const token = getAccessToken();
  const mergedHeaders: Record<string, string> = {
    accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      // Let browser set multipart/form-data boundary
      payload = body as unknown as BodyInit;
    } else {
      mergedHeaders["Content-Type"] = mergedHeaders["Content-Type"] || "application/json";
      payload = typeof body === "string" ? body : JSON.stringify(body);
    }
  }

  const res = await fetch(buildURL(path), {
    method,
    headers: mergedHeaders,
    body: payload,
    signal,
    credentials: "omit",
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : undefined;

  if (!res.ok) {
    if (res.status === 401) {
      const access = getAccessToken();
      const refresh = getRefreshToken();
      if (access && refresh) {
        try {
          const tokens = await refreshTokens({ accessToken: access, refreshToken: refresh });
          const existingSession = getSessionId() || "";
          const localAccess = typeof window !== 'undefined' ? window.localStorage.getItem('fx.accessToken') : null;
          const remember = !!localAccess && localAccess === access;
          saveSession({ tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn: tokens.expiresIn }, sessionId: existingSession }, remember);
          const retryHeaders = { ...headers, Authorization: `Bearer ${tokens.accessToken}` } as Record<string, string>;
          if (payload) retryHeaders["Content-Type"] = mergedHeaders["Content-Type"] || "application/json";
          const retryRes = await fetch(buildURL(path), {
            method,
            headers: retryHeaders,
            body: payload,
            signal,
            credentials: "omit",
          });
          const retryIsJson = retryRes.headers.get("content-type")?.includes("application/json");
          const retryData = retryIsJson ? await retryRes.json().catch(() => ({})) : undefined;
          if (!retryRes.ok) {
            let message = `HTTP ${retryRes.status}`;
            if (retryData) {
              if (typeof (retryData as any).message === "string") message = (retryData as any).message;
              else if ((retryData as any).error) {
                const err = (retryData as any).error;
                if (typeof err === "string") message = err;
                else if (typeof err?.message === "string") message = err.message;
              }
            }
            const error = new Error(message) as Error & { status?: number; data?: unknown };
            error.status = retryRes.status;
            error.data = retryData;
            throw error;
          }
          return retryData as T;
        } catch {
          clearSession();
        }
      }
    }
    let message = `HTTP ${res.status}`;
    if (data) {
      if (typeof (data as any).message === "string") message = (data as any).message;
      else if ((data as any).error) {
        const err = (data as any).error;
        if (typeof err === "string") message = err;
        else if (typeof err?.message === "string") message = err.message;
      }
    }
    const error = new Error(message) as Error & { status?: number; data?: unknown };
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export { BASE_URL };

export async function jsonFetchWithRetry<T>(path: string, options: JsonFetchOptions = {}, attempts: number = 2, delayMs: number = 300): Promise<T> {
  let lastError: any = null;
  const controller = new AbortController();
  const merged: JsonFetchOptions = { ...options, signal: options.signal || controller.signal };
  for (let i = 0; i < Math.max(1, attempts); i++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await jsonFetch<T>(path, merged);
    } catch (e: any) {
      lastError = e;
      if (i < attempts - 1) {
        // exponential backoff
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, i)));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

// Account-scoped helper to enforce accountId passing
import { getSelectedAccountId } from "../account";

export function withAccount<T extends Record<string, any>>(obj: T, required: boolean = true): T {
  const selected = getSelectedAccountId();
  if (!selected && required) {
    const error = new Error("Select an account to perform this action") as Error & { code?: string };
    error.code = "ACCOUNT_NOT_SELECTED";
    throw error;
  }
  return { ...obj, ...(selected ? { accountId: selected } : {}) } as T;
}

export async function formFetch<T>(path: string, form: FormData, headers: Record<string, string> = {}): Promise<T> {
  const token = getAccessToken();
  const merged: Record<string, string> = {
    accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
  const res = await fetch(buildURL(path), {
    method: "POST",
    headers: merged,
    body: form,
    credentials: "omit",
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : undefined;
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    if (data) {
      if (typeof (data as any).message === "string") message = (data as any).message;
      else if ((data as any).error) {
        const err = (data as any).error;
        if (typeof err === "string") message = err;
        else if (typeof err?.message === "string") message = err.message;
      }
    }
    const error = new Error(message) as Error & { status?: number; data?: unknown };
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data as T;
}
