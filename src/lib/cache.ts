export function getCache<T>(key: string, maxAgeMs?: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (maxAgeMs && obj && typeof obj.ts === 'number') {
      if (Date.now() - obj.ts > maxAgeMs) return null;
    }
    return obj && obj.data != null ? (obj.data as T) : null;
  } catch {
    return null;
  }
}

export function getStaleCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && obj.data != null ? (obj.data as T) : null;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  try {
    const obj = { ts: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {}
}
