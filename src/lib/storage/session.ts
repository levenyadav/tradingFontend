const LS_KEYS = {
  access: "fx.accessToken",
  refresh: "fx.refreshToken",
  session: "fx.sessionId",
  expires: "fx.expiresAt",
};

type SessionPayload = {
  tokens: { accessToken: string; refreshToken: string; expiresIn?: string };
  sessionId: string;
};

export function saveSession(payload: SessionPayload, rememberMe: boolean) {
  [window.localStorage, window.sessionStorage].forEach((s) => {
    s.removeItem(LS_KEYS.access);
    s.removeItem(LS_KEYS.refresh);
    s.removeItem(LS_KEYS.session);
    s.removeItem(LS_KEYS.expires);
  });
  const store = rememberMe ? window.localStorage : window.sessionStorage;
  store.setItem(LS_KEYS.access, payload.tokens.accessToken);
  store.setItem(LS_KEYS.refresh, payload.tokens.refreshToken);
  store.setItem(LS_KEYS.session, payload.sessionId);
  const exp = payload.tokens.expiresIn;
  if (exp) {
    const ms = parseExpiresIn(exp);
    const at = Date.now() + ms;
    store.setItem(LS_KEYS.expires, String(at));
  }
}

export function clearSession() {
  [window.localStorage, window.sessionStorage].forEach((store) => {
    store.removeItem(LS_KEYS.access);
    store.removeItem(LS_KEYS.refresh);
    store.removeItem(LS_KEYS.session);
    store.removeItem(LS_KEYS.expires);
  });
}

export function getAccessToken() {
  return (
    window.localStorage.getItem(LS_KEYS.access) ||
    window.sessionStorage.getItem(LS_KEYS.access) ||
    null
  );
}

export function getRefreshToken() {
  return (
    window.localStorage.getItem(LS_KEYS.refresh) ||
    window.sessionStorage.getItem(LS_KEYS.refresh) ||
    null
  );
}

export function getSessionId() {
  return (
    window.localStorage.getItem(LS_KEYS.session) ||
    window.sessionStorage.getItem(LS_KEYS.session) ||
    null
  );
}

export function getExpiresAt() {
  const v = window.localStorage.getItem(LS_KEYS.expires) || window.sessionStorage.getItem(LS_KEYS.expires);
  return v ? Number(v) : null;
}

function parseExpiresIn(v: string): number {
  const m = String(v).trim();
  const n = Number(m);
  if (!Number.isNaN(n)) return n * 1000;
  const rx = /^(\d+)([smhd])$/i;
  const mm = m.match(rx);
  if (!mm) return 3600_000;
  const val = Number(mm[1]);
  const unit = mm[2].toLowerCase();
  if (unit === 's') return val * 1000;
  if (unit === 'm') return val * 60 * 1000;
  if (unit === 'h') return val * 60 * 60 * 1000;
  if (unit === 'd') return val * 24 * 60 * 60 * 1000;
  return 3600_000;
}
