import { io, Socket } from "socket.io-client";
import { getAccessToken } from "../storage/session";
import { BASE_URL } from "../api/client";

type Listener = (data: any) => void;

class WSClient {
  // Underlying socket
  private socket: Socket | null = null;
  private connecting = false;
  // Event listeners registry keyed by event name
  private listeners: Map<string, Set<Listener>> = new Map();
  // Track active subscriptions for symbols/channels to rejoin on reconnect
  private subscribedSymbols: Set<string> = new Set();
  private subscribedChannels: Set<string> = new Set();
  // Heartbeat timer id
  private heartbeatTimer: number | null = null;
  // Reconnect backoff
  private reconnectDelay = 500; // will grow with backoff

  // Establish a single socket connection with robust reconnection and heartbeat
  connect() {
    if (this.socket) {
      if (!this.socket.connected) this.socket.connect();
      return;
    }
    if (this.connecting) return;
    this.connecting = true;
    const token = getAccessToken();
    const envUrl = import.meta.env?.VITE_WS_URL as string | undefined;
    let base = envUrl || (typeof window !== 'undefined' ? window.location.origin : BASE_URL);
    if (typeof window !== 'undefined') {
      const isHttps = window.location.protocol === 'https:';
      if (base.startsWith('ws://')) {
        base = isHttps ? base.replace('ws://', 'https://') : base.replace('ws://', 'http://');
      } else if (base.startsWith('http://')) {
        base = isHttps ? base.replace('http://', 'https://') : base;
      } else if (base.startsWith('wss://') || base.startsWith('https://')) {
        base = base;
      } else {
        base = (isHttps ? 'https://' : 'http://') + base.replace(/^\/+/, '');
      }
    } else {
      if (!/^https?:\/\//.test(base)) {
        base = 'https://' + base.replace(/^\/+/, '');
      }
    }
    this.socket = io(base, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      withCredentials: false,
    });

    // Dispatch all server events through our local listeners registry
    this.socket.onAny((event: string, payload: any) => {
      const set = this.listeners.get(event);
      if (set) {
        for (const fn of set) fn(payload);
      }
      const anySet = this.listeners.get('*');
      if (anySet) {
        for (const fn of anySet) fn({ event, payload });
      }
    });

    // On connect, reset backoff and resubscribe to previous rooms
    this.socket.on("connect", () => {
      this.reconnectDelay = 500;
      this.connecting = false;
      this.refreshAuthToken();
      this.startHeartbeat();
      this.resubscribeAll();
    });

    // On disconnect, stop heartbeat
    this.socket.on("disconnect", () => {
      this.stopHeartbeat();
    });

    // On reconnect attempt, apply exponential backoff up to max
    this.socket.io.on("reconnect_attempt", () => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 5000);
    });

    this.socket.on("connect_error", () => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 5000);
      this.refreshAuthToken();
    });
  }

  // Cleanly close the connection and clear state
  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.stopHeartbeat();
    this.listeners.clear();
    this.subscribedSymbols.clear();
    this.subscribedChannels.clear();
  }

  // Register a handler for a given event
  on(event: string, fn: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
  }

  // Remove a handler
  off(event: string, fn: Listener) {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(fn);
  }

  // Register a catch-all listener for any event
  onAny(fn: Listener) {
    if (!this.listeners.has('*')) this.listeners.set('*', new Set());
    this.listeners.get('*')!.add(fn);
  }

  offAny(fn: Listener) {
    const set = this.listeners.get('*');
    if (!set) return;
    set.delete(fn);
  }

  // Subscribe to symbols/channels with de-duplication and state tracking
  subscribe(params: { symbol?: string; timeframe?: string; symbols?: string[]; channels?: string[] }) {
    if (!this.socket) return;
    const symbols = (params.symbols || (params.symbol ? [params.symbol] : [])).map((s) => s.toUpperCase());
    const channels = params.channels || [];
    const newSymbols = symbols.filter((s) => !this.subscribedSymbols.has(s));
    const newChannels = channels.filter((c) => !this.subscribedChannels.has(c));
    if (newSymbols.length === 0 && newChannels.length === 0) return;
    newSymbols.forEach((s) => this.subscribedSymbols.add(s));
    newChannels.forEach((c) => this.subscribedChannels.add(c));
    this.socket.emit("subscribe", { ...params, symbols: [...newSymbols], channels: [...newChannels] });
  }

  // Unsubscribe and update local tracking sets
  unsubscribe(params: { symbols?: string[]; channels?: string[] }) {
    if (!this.socket) return;
    const symbols = (params.symbols || []).map((s) => s.toUpperCase());
    const channels = params.channels || [];
    symbols.forEach((s) => this.subscribedSymbols.delete(s));
    channels.forEach((c) => this.subscribedChannels.delete(c));
    this.socket.emit("unsubscribe", { symbols, channels });
  }

  // Forward trading actions
  placeOrder(params: { symbol: string; type: string; direction: string; volume: number; price?: number; stopPrice?: number; stopLoss?: number; takeProfit?: number; expiration?: string }) {
    if (!this.socket) return;
    try {
      const accountId = localStorage.getItem('mfapp.selectedAccountId');
      const payload = accountId ? { ...params, accountId } : params;
      this.socket.emit("place_order", payload);
    } catch {
      this.socket.emit("place_order", params);
    }
  }

  cancelOrder(params: { orderId: string }) {
    if (!this.socket) return;
    this.socket.emit("cancel_order", params);
  }

  modifyOrder(params: any) {
    if (!this.socket) return;
    this.socket.emit("modify_order", params);
  }

  // Send periodic ping to keep connection healthy; server should respond with pong
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.socket) return;
      this.socket.emit("ping", { ts: Date.now() });
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Rejoin previously tracked rooms on reconnect
  private resubscribeAll() {
    if (!this.socket) return;
    const symbols = [...this.subscribedSymbols];
    const channels = [...this.subscribedChannels];
    if (symbols.length > 0 || channels.length > 0) {
      this.socket.emit("subscribe", { symbols, channels });
    }
  }

  private refreshAuthToken() {
    if (!this.socket) return;
    try {
      const token = getAccessToken();
      // update auth without full teardown
      (this.socket as any).io.opts.auth = { token };
    } catch {}
  }
}

const wsClient = new WSClient();
export default wsClient;
