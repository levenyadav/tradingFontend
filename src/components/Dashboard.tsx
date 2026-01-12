import { ArrowUpRight, ArrowDownRight, Plus, TrendingUp, TrendingDown, ShieldAlert, Clock, Hash } from 'lucide-react';
import { formatCurrency, formatRelativeTime, formatPrice } from '../lib/mockData';
import { computeUnrealizedPLUSD, computePLPercent, computePips } from '../lib/forex';
import { Button } from './ui/button';
import { useAccount } from '../lib/account';
import { useEffect, useState } from 'react';
import { getMe } from '../lib/api/user';
import { getAccounts } from '../lib/api/accounts';
import { getPositions } from '../lib/api/positions';
import { getPendingOrdersCount } from '../lib/api/orders';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import { getWatchlist } from '../lib/api/watchlist';
import wsClient from '../lib/ws/client';
import PositionsDetailModal from './PositionsDetailModal';
import { playUiSound } from '../lib/sound';

interface DashboardProps {
  userName: string;
  onNavigate: (screen: string) => void;
}

export function Dashboard({ userName, onNavigate }: DashboardProps) {
  const [profileName, setProfileName] = useState<string>(userName);
  const [kycStatus, setKycStatus] = useState<string | undefined>(undefined);
  const { selectedAccountId, setSelectedAccountId, accounts, setAccounts } = useAccount();
  const activeAccount = accounts.find(a => a._id === selectedAccountId) || accounts[0];
  const [positionsOpen, setPositionsOpen] = useState<Array<any>>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<Array<{ symbol: string; price: number; changePercent: number }>>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const filteredOpen = (positionsOpen || []).filter(p => {
    if (!activeAccount) return true;
    const aid = String(activeAccount._id || '');
    const posAccId = String((p as any).accountId?._id || (p as any).account?.id || '');
    return aid && posAccId && aid === posAccId;
  });
  const openCount = filteredOpen.length;
  const openPLTotal = filteredOpen.reduce((sum, p) => {
    const val = (p.profitLoss ?? p.unrealizedPL ?? 0) as number;
    return sum + (typeof val === 'number' ? val : 0);
  }, 0);
  const allPLTotal = (positionsOpen || []).reduce((sum, p: any) => {
    const serverPL = typeof (p as any).unrealizedPL === 'number' ? Number((p as any).unrealizedPL) : null;
    if (serverPL != null) return sum + serverPL;
    const open = Number(p.openPrice);
    const cur = Number((p as any).currentPrice ?? open);
    const vol = Number(p.volume);
    const val = computeUnrealizedPLUSD(String(p.symbol), String(p.direction), open, cur, vol);
    return sum + (isFinite(val) ? val : 0);
  }, 0);
  const allMarginTotal = (positionsOpen || []).reduce((sum, p: any) => {
    const m = p.margin ?? 0;
    return sum + (typeof m === 'number' ? m : 0);
  }, 0);
  const basis = allMarginTotal > 0 ? allMarginTotal : (activeAccount?.equity || 0);
  const todayPLPercent = basis > 0 ? (allPLTotal / basis) * 100 : 0;

  const [homeReady, setHomeReady] = useState(false);
  const [watchlistReady, setWatchlistReady] = useState(false);
  const [marketReady, setMarketReady] = useState(false);
  const [positionsVisible, setPositionsVisible] = useState(3);
  const [accountReveal, setAccountReveal] = useState(0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await getMe();
        if (!mounted) return;
        const displayName = me.firstName || me.email || profileName;
        setProfileName(displayName);
        // Capture KYC status if available
        setKycStatus((me as any).kycStatus);

        const accts = await getAccounts('active');
        if (!mounted) return;
        setAccounts(accts);
        const exists = selectedAccountId ? accts.some(a => String(a._id) === String(selectedAccountId)) : false;
        if (!exists) {
          if (accts.length === 1) setSelectedAccountId(accts[0]?._id || null);
          else setSelectedAccountId(null);
        }
        setAccountReveal(1);
        const seq = setInterval(() => {
          setAccountReveal((v) => Math.min((accts?.length || 1), v + 1));
        }, 250);
        setTimeout(() => clearInterval(seq), 2000);

        const open = await getPositions({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });
        const wl = await getWatchlist();
        const pendingCnt = await getPendingOrdersCount({ page: 1, limit: 50 });
        if (!mounted) return;
        setPositionsOpen(open);
        setWatchlist(wl);
        setPendingOrdersCount(pendingCnt);
      } catch (e: any) {
        setError(e?.message || 'Failed to load data');
      } finally {
        setLoading(false);
        setTimeout(() => { setHomeReady(true); setWatchlistReady(true); setMarketReady(true); }, 200);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setPositionsVisible((v) => v + 3);
    }, { rootMargin: '120px' });
    const el = document.getElementById('positions-sentinel');
    if (el) io.observe(el);
    return () => io.disconnect();
  }, [filteredOpen.length]);

  useEffect(() => {
    // Listen for account balance/equity updates (room-based or global)
    wsClient.connect();
    wsClient.subscribe({ channels: ['account'] });
    const onBalance = (payload: any) => {
      setAccounts(prev => {
        if (!prev || prev.length === 0) return prev;
        const id = String(payload.accountId || payload._id || '');
        const idx = prev.findIndex(a => String(a._id) === id);
        if (idx === -1) return prev;
        const next = [...prev];
        const curr = next[idx];
        next[idx] = {
          ...curr,
          balance: typeof payload.balance === 'number' ? payload.balance : curr.balance,
          equity: typeof payload.equity === 'number' ? payload.equity : (typeof payload.balanceLive === 'number' ? payload.balanceLive : curr.equity),
          freeMargin: typeof payload.freeMargin === 'number' ? payload.freeMargin : (typeof payload.availableBalance === 'number' ? payload.availableBalance : curr.freeMargin),
          margin: typeof payload.marginUsed === 'number' ? payload.marginUsed : curr.margin,
          marginLevel: typeof payload.marginLevel === 'number' ? Number((payload.marginLevel as number).toFixed ? (payload.marginLevel as number).toFixed(2) : payload.marginLevel) : curr.marginLevel,
        };
        return next;
      });
    };
    const onNotify = (n: any) => {
      if (n && n.type === 'margin_call') {
        setError('Margin call risk detected');
        playUiSound('warning');
      }
    };
    wsClient.on('balance_update', onBalance);
    wsClient.on('notification', onNotify);
    return () => {
      wsClient.off('balance_update', onBalance);
      wsClient.off('notification', onNotify);
    };
  }, []);

  useEffect(() => {
    // Subscribe to live updates for watchlist and open positions symbols
    const wlSymbols = (watchlist || []).map(w => w.symbol.toUpperCase());
    const posSymbols = (positionsOpen || []).map(p => String(p.symbol || '').toUpperCase());
    const symbols = Array.from(new Set([...wlSymbols, ...posSymbols]));
    if (symbols.length === 0) return;
    wsClient.connect();
    wsClient.subscribe({ symbols, channels: ['positions'] });

    // Batch UI updates per animation frame for performance
    const pending: Record<string, any> = {};
    let rafId: number | null = null;
    const flush = () => {
      // Update watchlist items
      setWatchlist(prev => {
        if (!prev || prev.length === 0) return prev;
        let next = prev;
        for (const sym of Object.keys(pending)) {
          const p = pending[sym];
          const idx = next.findIndex(x => x.symbol.toUpperCase() === sym);
          if (idx !== -1) {
            const curr = next[idx];
            const updated = {
              ...curr,
              price: typeof p.mid === 'number' ? p.mid : (typeof p.bid === 'number' ? p.bid : curr.price),
              changePercent: typeof p.changePercent === 'number' ? p.changePercent : curr.changePercent,
            };
            if (next === prev) next = [...prev];
            next[idx] = updated;
          }
        }
        return next;
      });
      // Update open positions current price and derived PL, prefer id/positionId match
      setPositionsOpen(prev => {
        if (!prev || prev.length === 0) return prev;
        let next = prev;
        for (const sym of Object.keys(pending)) {
          const p = pending[sym];
          const byId = typeof p.id === 'string' ? next.findIndex(x => String((x as any).id || '') === p.id) : -1;
          const byPosId = typeof p.positionId === 'string' ? next.findIndex(x => String((x as any).positionId || '') === p.positionId) : -1;
          const idxs = [] as number[];
          if (byId !== -1) idxs.push(byId);
          else if (byPosId !== -1) idxs.push(byPosId);
          else {
            const symIdxs = next.map((x, i) => ({ i, s: String(x.symbol || '').toUpperCase() })).filter(({ s }) => s === sym).map(({ i }) => i);
            idxs.push(...symIdxs);
          }
          if (idxs.length > 0) {
            if (next === prev) next = [...prev];
            for (const i of idxs) {
              const curr = next[i];
              const currentPrice = typeof p.currentPrice === 'number' ? p.currentPrice : (typeof p.mid === 'number' ? p.mid : (typeof p.bid === 'number' ? p.bid : (curr as any).currentPrice));
              const unrealizedPL = typeof p.unrealizedPL === 'number' ? p.unrealizedPL : (curr as any).unrealizedPL;
              const pips = typeof p.pipMovement === 'number' ? p.pipMovement : (curr as any).pips;
              const margin = Number((curr as any).margin || 0);
              const percent = margin > 0 && typeof unrealizedPL === 'number' ? (unrealizedPL / margin) * 100 : (curr as any).unrealizedPLPercent;
              const commission = typeof p.commission === 'number' ? p.commission : (curr as any).commission;
              const swap = typeof p.swap === 'number' ? p.swap : (curr as any).swap;
              const spread = typeof p.spread === 'number' ? p.spread : (curr as any).spread;
              const totalCosts = typeof p.totalCosts === 'number' ? p.totalCosts : (curr as any).totalCosts;
              const costs = (p as any).costs || (curr as any).costs;
              const mergedCosts = costs ? {
                commission: typeof (costs as any).commission === 'number' ? (costs as any).commission : commission,
                swap: typeof (costs as any).swap === 'number' ? (costs as any).swap : swap,
                spread: typeof (costs as any).spread === 'number' ? (costs as any).spread : spread,
                total: typeof (costs as any).total === 'number' ? (costs as any).total : (typeof totalCosts === 'number' ? totalCosts : undefined),
              } : {
                commission,
                swap,
                spread,
                total: typeof totalCosts === 'number' ? totalCosts : undefined,
              };
              next[i] = { ...curr, currentPrice, unrealizedPL, pips, unrealizedPLPercent: percent, commission: mergedCosts.commission, swap: mergedCosts.swap, spread: mergedCosts.spread, totalCosts: mergedCosts.total, costs: mergedCosts } as any;
            }
          }
        }
        return next;
      });
      for (const k of Object.keys(pending)) delete pending[k];
      rafId = null;
    };

    const onPrice = (payload: any) => {
      const sym = String(payload.symbol || '').toUpperCase();
      pending[sym] = { ...(pending[sym] || {}), ...payload };
      if (rafId == null) rafId = requestAnimationFrame(flush);
    };
    const onPnl = (payload: any) => {
      const sym = String(payload.symbol || '').toUpperCase();
      pending[sym] = { ...(pending[sym] || {}), ...payload };
      if (rafId == null) rafId = requestAnimationFrame(flush);
    };
    const onOrder = (payload: any) => {
      const s = String((payload && (payload.status || payload.orderStatus)) || '').toLowerCase();
      if (s.includes('execut') || s.includes('filled')) playUiSound('order-success');
      else if (s.includes('cancel') || s.includes('reject')) playUiSound('order-error');
    };
    const onPositionClosed = (payload: any) => {
      playUiSound('position-closed');
      const id = String(payload?.id || payload?._id || payload?.positionId || '');
      if (!id) return;
      setPositionsOpen(prev => prev.filter(p => String((p as any).id || (p as any)._id) !== id));
    };
    const onPositionOpened = (payload: any) => {
      playUiSound('position-opened');
    };
    wsClient.on('PRICE_UPDATE', onPrice);
    wsClient.on('PNL_UPDATE', onPnl);
    wsClient.on('POSITION_UPDATE', onPnl);
    wsClient.on('ORDER_UPDATE', onOrder);
    wsClient.on('POSITION_CLOSED', onPositionClosed);
    wsClient.on('POSITION_OPENED', onPositionOpened);

    return () => {
      wsClient.unsubscribe({ symbols });
      wsClient.off('PRICE_UPDATE', onPrice);
      wsClient.off('PNL_UPDATE', onPnl);
      wsClient.off('POSITION_UPDATE', onPnl);
      wsClient.off('ORDER_UPDATE', onOrder);
      wsClient.off('POSITION_CLOSED', onPositionClosed);
      wsClient.off('POSITION_OPENED', onPositionOpened);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [watchlist.map(w => w.symbol).join(','), positionsOpen.map(p => String(p.symbol)).join(',')]);

  return (
    <div className="pb-20 md:pb-8">
      {/* Greeting */}
      <div className="px-4 pt-6 pb-4 bg-gradient-to-br from-blue-700 to-blue-900 text-white" aria-busy={!homeReady} aria-live="polite">
        <h2 className="mb-1">{getGreeting()}, {profileName}</h2>
        <p className="text-blue-100">Welcome to your trading dashboard</p>
        {kycStatus === 'pending' && (
          <div className="mt-5 rounded-2xl border border-yellow-200 bg-gradient-to-br from-orange-50 to-yellow-50 shadow-sm p-5" role="alert">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3 min-w-0">
                <div className="shrink-0">
                  <ShieldAlert className="w-6 h-6 text-red-700" />
                </div>
                <div className="space-y-1">
                  <p className="text-red-900 font-semibold">Action required</p>
                  <p className="text-sm text-yellow-800 leading-relaxed">Please verify your account and complete your KYC</p>
                </div>
              </div>
              <div className="shrink-0">
                <Button
                  onClick={() => { try { localStorage.setItem('mfapp.settingsInitialSection', 'kyc'); } catch {}; onNavigate('settings'); }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white rounded-md px-4 py-2 shadow-sm"
                >
                  Complete KYC
                </Button>
              </div>
            </div>
          </div>
        )}
        {kycStatus === 'processing' && (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm p-5" role="status">
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                <Clock className="w-6 h-6 text-blue-700" />
              </div>
              <div className="space-y-1">
                <p className="text-blue-900 font-semibold">Application under review</p>
                <p className="text-sm text-blue-800 leading-relaxed">Your KYC documents are being reviewed. We’ll notify you once verification is complete.</p>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="mt-2 bg-white/10 text-white rounded px-3 py-2 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Account Overview Card */}
      <div className="px-4 -mt-6">
        <div className="bg-white rounded-xl shadow-lg p-5 mb-4" aria-busy={!homeReady}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Account Balance</p>
              <h1 className="text-gray-900">{activeAccount && accountReveal > 0 ? formatCurrency(activeAccount.balance, activeAccount.currency) : '—'}</h1>
              </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => onNavigate('wallet-deposit')}
                className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                aria-label="Deposit"
              >
                <ArrowDownRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => onNavigate('wallet-withdraw')}
                className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                aria-label="Withdraw"
              >
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Equity</p>
              <p className="text-gray-900">{activeAccount && accountReveal > 0 ? formatCurrency(activeAccount.equity, activeAccount.currency) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Free Margin</p>
              <p className="text-gray-900">{activeAccount && accountReveal > 0 ? formatCurrency(activeAccount.freeMargin, activeAccount.currency) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Margin Level</p>
              <p className={`${activeAccount && activeAccount.marginLevel > 100 ? 'text-green-600' : 'text-red-600'}`}>
                {activeAccount && accountReveal > 0 ? activeAccount.marginLevel : '—'}%
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Today's P&L</p>
            <p className={`text-lg ${allPLTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {allPLTotal >= 0 ? '+' : ''}{formatCurrency(Math.abs(allPLTotal), activeAccount?.currency || 'USD')}
            </p>
            <p className={`text-xs ${todayPLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {todayPLPercent >= 0 ? '+' : ''}{Number(todayPLPercent).toFixed(2)}%
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Open Positions</p>
            <p className="text-lg text-gray-900">{Number(openCount)}</p>
            <button
              onClick={() => onNavigate('portfolio')}
              className="text-xs text-blue-700 hover:text-blue-800"
            >
              View all
            </button>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Pending Orders</p>
            <p className="text-lg text-gray-900">{Number(pendingOrdersCount)}</p>
            <button
              onClick={() => onNavigate('portfolio')}
              className="text-xs text-blue-700 hover:text-blue-800"
            >
              View all
            </button>
          </div>
        </div>

        {/* Watchlist */}
        <div className="mb-6" aria-busy={!homeReady}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900">Watchlist</h3>
            <button
              onClick={() => onNavigate('markets')}
              className="text-sm text-blue-700 hover:text-blue-800"
            >
              View All
            </button>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[0,1,2].map(i => (
                  <div key={i} className="w-full bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-left">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                        <div className="h-3 bg-gray-200 rounded w-16" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="h-4 bg-gray-200 rounded w-20 mb-1" />
                          <div className="h-3 bg-gray-200 rounded w-16" />
                        </div>
                        <div className="w-16 h-10 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {watchlist.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => onNavigate('markets')}
                    className="w-full bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {(() => {
                      const symbol = item.symbol;
                      const livePrice = typeof (item as any).mid === 'number' ? (item as any).mid
                        : typeof (item as any).rate === 'number' ? (item as any).rate
                        : typeof (item as any).price === 'number' ? (item as any).price
                        : 0;
                      const pct = typeof (item as any).changePercent === 'number' ? (item as any).changePercent
                        : typeof (item as any).changePercent24h === 'number' ? (item as any).changePercent24h
                        : 0;
                      return (
                        <div className="flex items-center justify-between">
                          <div className="flex-1 text-left">
                            <p className="text-gray-900 mb-1">{symbol}</p>
                            <p className="text-xs text-gray-500">Watchlist</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-gray-900 font-mono">
                                {formatPrice(livePrice, symbol)}
                              </p>
                              <div className="flex items-center justify-end gap-1">
                                {pct >= 0 ? (
                                  <TrendingUp className="w-3 h-3 text-green-600" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 text-red-600" />
                                )}
                                <span className={`text-xs ${pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {pct >= 0 ? '+' : ''}{Number(pct).toFixed(2)}%
                                </span>
                              </div>
                            </div>
                            <div className="w-16 h-10">
                              <svg viewBox="0 0 60 40" className={pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                                <polyline
                                  points="0,30 10,25 20,28 30,20 40,22 50,15 60,10"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </button>
                ))}
                <button
                  onClick={() => onNavigate('markets')}
                  className="w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <Plus className="w-5 h-5" />
                    <span>Add to Watchlist</span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Open Positions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900">Open Positions</h3>
            <button
              onClick={() => onNavigate('portfolio')}
              className="text-sm text-blue-700 hover:text-blue-800"
            >
              View All
            </button>
          </div>

          <div className="space-y-2">
            {(positionsOpen
              .filter(p => !activeAccount || (p.account?.id === activeAccount._id) || (p.accountId?._id === activeAccount._id))
              .slice(0, positionsVisible)
            ).map((position) => (
              <div
                key={position.id || position._id || position.positionId}
                className="bg-white rounded-lg p-4 shadow-sm cursor-pointer"
                role="button"
                onClick={() => { setSelectedPosition(String(position.id || position._id || position.positionId)); setDetailOpen(true); }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900">{position.symbol}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      position.direction === 'buy' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {String(position.direction).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className={`${(position as any).unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(() => {
                        const cur = position.account?.currency || (position as any).accountId?.currency || 'USD';
                        const plVal = typeof (position as any).unrealizedPL === 'number'
                          ? (position as any).unrealizedPL
                          : computeUnrealizedPLUSD(position.symbol, position.direction, position.openPrice as any, (position as any).currentPrice as any, position.volume as any);
                        const pct = (position as any).margin && Number((position as any).margin) > 0
                          ? (plVal / Number((position as any).margin)) * 100
                          : computePLPercent(plVal, (position as any).margin);
                        const sign = plVal >= 0 ? '+' : '';
                        return `${sign}${formatCurrency(Math.abs(plVal), cur)}${pct != null ? ` (${pct >= 0 ? '+' : ''}${Number(pct).toFixed(2)}%)` : ''}`;
                      })()}
                    </p>
                    <p className="text-xs text-gray-500">Pips {(() => {
                      const serverPips = typeof (position as any).pips === 'number' ? Number((position as any).pips) : null;
                      const raw = serverPips != null
                        ? serverPips
                        : computePips(position.symbol, position.direction, position.openPrice as any, (position as any).currentPrice as any);
                      const dir = String(position.direction).toLowerCase();
                      const show = dir === 'sell' ? -raw : raw;
                      return show.toFixed(2);
                    })()}</p>
                    <p className="text-xs text-gray-500">Lots {position.volume}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Entry</p>
                    <p className="text-gray-900 font-mono">{formatPrice(position.openPrice, position.symbol)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Current</p>
                    <p className="text-gray-900 font-mono">{formatPrice(position.currentPrice, position.symbol)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Time</p>
                    <p className="text-gray-900">{formatRelativeTime(position.openedAt)}</p>
                  </div>
                </div>
              </div>
            ))}

            {positionsOpen.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No open positions</p>
                <Button
                  onClick={() => onNavigate('trading')}
                  className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg"
                >
                  Start Trading
                </Button>
              </div>
            )}
            <div id="positions-sentinel" className="h-8" />
          </div>
        </div>

        {/* Market Overview */}
        <div className="mb-6" aria-busy={!marketReady}>
          <h3 className="text-gray-900 mb-3">Market Overview</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 animate-pulse">
              <p className="text-xs text-green-700 mb-1">Top Gainer</p>
              <p className="text-green-900 mb-1">USD/JPY</p>
              <p className="text-green-700">+0.83%</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 animate-pulse">
              <p className="text-xs text-red-700 mb-1">Top Loser</p>
              <p className="text-red-900 mb-1">AUD/USD</p>
              <p className="text-red-700">-1.34%</p>
            </div>
          </div>
        </div>

      </div>
      <PositionsDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        positionId={selectedPosition}
        onClosed={(id) => {
          setPositionsOpen(prev => prev.filter(p => String((p as any).id || (p as any)._id) !== String(id)));
        }}
      />
    </div>
  );
}
