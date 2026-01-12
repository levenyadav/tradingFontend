import { useEffect, useState } from 'react';
import { X, MoreVertical } from 'lucide-react';
import { formatCurrency, formatPrice, formatDateTime, formatRelativeTime } from '../lib/mockData';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getPositionsPage, getPositionsHistory, PositionItem } from '../lib/api/positions';
import { getPendingOrders, cancelOrder } from '../lib/api/orders';
import PositionsDetailModal from './PositionsDetailModal';
import { playUiSound } from '../lib/sound';
import { validatePosition } from '../lib/forex-validation';
import wsClient from '../lib/ws/client';
import { useAccount } from '../lib/account';
import { Skeleton } from './ui/skeleton';
import { Spinner } from './ui/spinner';
import { EmptyState } from './EmptyState';

interface PortfolioProps {
  onClosePosition: (positionId: string) => void;
  onCancelOrder: (orderId: string) => void;
}

export function Portfolio({ onClosePosition, onCancelOrder }: PortfolioProps) {
  const { selectedAccountId, accounts } = useAccount();
  const active = accounts.find(a => String(a._id) === String(selectedAccountId));
  const acctText = active?.accountNumber ? String(active.accountNumber) : (selectedAccountId ? String(selectedAccountId).slice(-6) : null);
  const typeText = active?.accountType ? String(active.accountType) : 'standard';
  const [activeTab, setActiveTab] = useState<'open' | 'pending' | 'history'>('open');
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [openPositions, setOpenPositions] = useState<PositionItem[]>([]);
  const [openMeta, setOpenMeta] = useState<{ page: number; limit: number; total: number; pages: number } | null>(null);
  const [openLoading, setOpenLoading] = useState(false);
  const [openSymbol, setOpenSymbol] = useState<string>('');
  const [openPage, setOpenPage] = useState<number>(1);

  const [pendingOrders, setPendingOrders] = useState<Array<{ id: string; symbol: string; type: string; direction: string; volume: number; status: string; createdAt: string }>>([]);
  const [pendingMeta, setPendingMeta] = useState<{ page: number; limit: number; total: number; pages: number } | null>(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({});

  const [trades, setTrades] = useState<PositionItem[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);

  const tabs = [
    { id: 'open' as const, label: 'Open Positions', count: openMeta?.total ?? openPositions.length },
    { id: 'pending' as const, label: 'Pending Orders', count: pendingMeta?.total ?? pendingOrders.length },
    { id: 'history' as const, label: 'Trade History', count: trades.length },
  ];

  useEffect(() => {
    if (activeTab !== 'open') return;
    setOpenLoading(true);
    getPositionsPage({ page: openPage, limit: 20, sortBy: 'createdAt', sortOrder: 'desc', symbol: openSymbol || undefined })
      .then((res) => {
        const sel = String(selectedAccountId || '');
        const filtered = sel
          ? (res.items || []).filter((p: any) => {
              const pid = String(p?.account?.id || p?.accountId?._id || '');
              return pid && pid === sel;
            })
          : res.items || [];
        setOpenPositions(filtered);
        setOpenMeta(res.pagination || null);
      })
      .finally(() => setOpenLoading(false));
  }, [activeTab, openSymbol, openPage, selectedAccountId]);

  useEffect(() => {
    if (activeTab !== 'open') return;
    wsClient.connect();
    const onPnl = (p: any) => {
      const sym = String(p.symbol || '').toUpperCase();
      setOpenPositions(prev => {
        if (!prev || prev.length === 0) return prev;
        let next = prev;
        for (let i = 0; i < prev.length; i++) {
          const pos = prev[i] as any;
          const match = (typeof p.id === 'string' && String(pos.id || '') === p.id)
            || (typeof p.positionId === 'string' && String(pos.positionId || '') === p.positionId)
            || (String(pos.symbol || '').toUpperCase() === sym);
          if (match) {
            const updatedPrice = typeof p.currentPrice === 'number' ? p.currentPrice : pos.currentPrice;
            const updatedPL = typeof p.unrealizedPL === 'number' ? p.unrealizedPL : pos.unrealizedPL;
            const updatedPips = typeof p.pipMovement === 'number' ? p.pipMovement : pos.pips;
            const percent = pos.margin && Number(pos.margin) > 0 ? (Number(updatedPL || 0) / Number(pos.margin)) * 100 : pos.unrealizedPLPercent;
            const commission = typeof p.commission === 'number' ? p.commission : pos.commission;
            const swap = typeof p.swap === 'number' ? p.swap : pos.swap;
            const spread = typeof p.spread === 'number' ? p.spread : pos.spread;
            const totalCosts = typeof p.totalCosts === 'number' ? p.totalCosts : pos.totalCosts;
            const costs = (p as any).costs || pos.costs;
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
            if (next === prev) next = [...prev];
            next[i] = { ...pos, currentPrice: updatedPrice, unrealizedPL: updatedPL, pips: updatedPips, unrealizedPLPercent: percent, commission: mergedCosts.commission, swap: mergedCosts.swap, spread: mergedCosts.spread, totalCosts: mergedCosts.total, costs: mergedCosts };
          }
        }
        return next;
      });
    };
    const onPositionClosed = (payload: any) => {
      try { playUiSound('position-closed'); } catch {}
      const id = String(payload?.id || payload?._id || payload?.positionId || '');
      if (!id) return;
      setOpenPositions(prev => prev.filter(p => String((p as any).id || (p as any)._id) !== id));
      setOpenMeta(m => m ? { ...m, total: Math.max(0, (m.total || 0) - 1) } : m);
    };
    const onPositionOpened = (payload: any) => { try { playUiSound('position-opened'); } catch {} };
    wsClient.on('PNL_UPDATE', onPnl);
    wsClient.on('POSITION_CLOSED', onPositionClosed);
    wsClient.on('POSITION_OPENED', onPositionOpened);
    return () => {
      wsClient.off('PNL_UPDATE', onPnl);
      wsClient.off('POSITION_CLOSED', onPositionClosed);
      wsClient.off('POSITION_OPENED', onPositionOpened);
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'pending') return;
    setPendingLoading(true);
    getPendingOrders({ page: 1, limit: 50 })
      .then((res) => { setPendingOrders(res.items); setPendingMeta(res.meta || null); })
      .finally(() => setPendingLoading(false));
  }, [activeTab, selectedAccountId]);

  useEffect(() => {
    if (activeTab !== 'history') return;
    setTradesLoading(true);
    getPositionsHistory({ page: 1, limit: 20, sortBy: 'closedAt', sortOrder: 'desc' })
      .then((items) => {
        const sel = String(selectedAccountId || '');
        const filtered = sel
          ? (items || []).filter((p: any) => {
              const pid = String(p?.account?.id || p?.accountId?._id || '');
              return pid && pid === sel;
            })
          : items || [];
        setTrades(filtered);
      })
      .finally(() => setTradesLoading(false));
  }, [activeTab, selectedAccountId]);

  return (
    <div className="pb-20 md:pb-8">
      {/* Tabs */}
      <div className="sticky top-14 bg-white border-b border-gray-200 z-30">
        <div className="flex items-center justify-between">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700" />
              )}
            </button>
          ))}
          {/* Active account badge moved to TopBar */}
        </div>
      </div>

      <div className="p-4">
        {/* Open Positions Tab */}
        {activeTab === 'open' && (
          <>
            <div className="hidden bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-700 mb-1">Positions</p>
                  <p className="text-blue-900">{openMeta?.total ?? openPositions.length}</p>
                </div>
                <div>
                  <p className="text-blue-700 mb-1">Filter</p>
                  <div className="flex gap-2">
                    <Input placeholder="Symbol e.g. EUR/USD" value={openSymbol} onChange={(e) => setOpenSymbol(e.target.value.toUpperCase())} />
                  </div>
                </div>
                <div>
                  <p className="text-blue-700 mb-1">Page</p>
                  <p className="text-blue-900">{openMeta?.page ?? 1}</p>
                </div>
              </div>
            </div>

            {/* Positions List */}
            <div className="space-y-3">
              {openLoading && (
                <div className="bg-white rounded-lg shadow-sm p-4" aria-busy="true" aria-live="polite">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-1/3" />
                    <div className="grid grid-cols-4 gap-3">
                      <Skeleton className="h-5" />
                      <Skeleton className="h-5" />
                      <Skeleton className="h-5" />
                      <Skeleton className="h-5" />
                    </div>
                  </div>
                </div>
              )}
              {!openLoading && openPositions.map((position) => {
                const v = validatePosition({
                  symbol: String(position.symbol),
                  direction: String(position.direction) as 'buy' | 'sell',
                  volume: Number(position.volume),
                  openPrice: Number(position.openPrice),
                  currentPrice: Number(position.currentPrice),
                  unrealizedPL: Number((position as any).unrealizedPL ?? 0),
                  margin: Number((position as any).margin ?? 0),
                  pips: Number((position as any).pips ?? 0),
                  unrealizedPLPercent: Number((position as any).unrealizedPLPercent ?? 0),
                });
                const plValue = v.calculated.unrealizedPL;
                const pctValue = v.calculated.unrealizedPLPercent;
                return (
                <div
                  key={position.id}
                  className="bg-white rounded-lg shadow-sm p-4 cursor-pointer"
                  role="button"
                  onClick={() => { setSelectedPosition(String(position.id)); setDetailOpen(true); }}
                >
                  
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">{position.symbol}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        position.direction === 'buy'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {position.direction.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedPosition(selectedPosition === position.id ? null : position.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-3 text-sm">
                    <div>
                      <p className="text-gray-500">Entry</p>
                      <p className="text-gray-900 font-mono">{formatPrice(Number(position.openPrice), position.symbol)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Current</p>
                      <p className="text-gray-900 font-mono">{formatPrice(Number(position.currentPrice), position.symbol)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Lots</p>
                      <p className="text-gray-900">{Number(position.volume)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Time</p>
                      <p className="text-gray-900">{formatRelativeTime(String(position.openedAt))}</p>
                    </div>
                  </div>

                  {(position as any).stopLoss || (position as any).takeProfit ? (
                    <div className="flex gap-3 mb-3 text-xs">
                      {position.stopLoss ? (
                        <div className="flex-1 bg-red-50 rounded px-2 py-1">
                          <span className="text-red-700">SL set: </span>
                          <span className="text-red-900 font-mono">{formatPrice(Number(position.stopLoss), position.symbol)}</span>
                        </div>
                      ) : null}
                      {position.takeProfit ? (
                        <div className="flex-1 bg-green-50 rounded px-2 py-1">
                          <span className="text-green-700">TP set: </span>
                          <span className="text-green-900 font-mono">{formatPrice(Number(position.takeProfit), position.symbol)}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className={`${plValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <p className="text-lg">{formatCurrency(plValue)}</p>
                      <p className="text-xs">{pctValue.toFixed(2)}%</p>
                    </div>
                    <Button
                      onClick={() => { setSelectedPosition(String(position.id)); setDetailOpen(true); }}
                      variant="outline"
                      className="h-9 border-red-600 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Close Position
                    </Button>
                  </div>
                </div>
              )})}

              {!openLoading && openPositions.length === 0 && (
                <EmptyState title="No open positions" message="Your open positions will appear here" />
              )}
              {!openLoading && (openMeta?.pages ?? 1) > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button variant="outline" disabled={openPage <= 1} onClick={() => setOpenPage(Math.max(1, openPage - 1))}>Prev</Button>
                  <span className="text-sm text-gray-700">Page {openMeta?.page ?? openPage} / {openMeta?.pages ?? 1}</span>
                  <Button variant="outline" disabled={openMeta ? openPage >= (openMeta.pages ?? 1) : true} onClick={() => setOpenPage((openMeta?.pages ?? openPage) > openPage ? openPage + 1 : openPage)}>Next</Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Pending Orders Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-3">
            {pendingLoading && (
              <div className="bg-white rounded-lg shadow-sm p-4" aria-busy="true" aria-live="polite">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/3" />
                  <div className="grid grid-cols-3 gap-3">
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                  </div>
                </div>
              </div>
            )}
            {!pendingLoading && pendingOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900">{order.symbol}</span>
                    <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                      order.type === 'limit' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {order.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      order.direction === 'buy'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {order.direction.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                  <div>
                    <p className="text-gray-500">Lots</p>
                    <p className="text-gray-900">{order.volume}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="text-gray-900">{formatRelativeTime(order.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-sm text-orange-600">Waiting for price...</span>
                  <Button
                    onClick={async () => {
                      setCancelling(prev => ({ ...prev, [order.id]: true }));
                      try {
                        await cancelOrder(order.id);
                        setPendingOrders(prev => prev.filter(o => o.id !== order.id));
                        setPendingMeta(m => m ? { ...m, total: Math.max(0, (m.total || 0) - 1) } : m);
                      } catch {}
                      finally {
                        setCancelling(prev => ({ ...prev, [order.id]: false }));
                      }
                    }}
                    variant="outline"
                    className="h-9 border-gray-300 rounded-lg"
                  >
                    {cancelling[order.id] ? (
                      <span className="flex items-center gap-2"><Spinner size={14} /> <span>Canceling...</span></span>
                    ) : 'Cancel Order'}
                  </Button>
                </div>
              </div>
            ))}

            {!pendingLoading && pendingOrders.length === 0 && (
              <EmptyState title="No pending orders" message="Your pending orders will appear here" />
            )}
          </div>
        )}

        {/* Trade History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {tradesLoading && (
              <div className="bg-white rounded-lg shadow-sm p-4" aria-busy="true" aria-live="polite">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/3" />
                  <div className="grid grid-cols-4 gap-3">
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                  </div>
                </div>
              </div>
            )}
            {!tradesLoading && trades.map((trade) => (
              <div key={trade.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900">{trade.symbol}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${String(trade.direction) === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{String(trade.direction).toUpperCase()}</span>
                  </div>
                  <div className={`text-right ${Number((trade as any).profitLoss ?? (trade as any).unrealizedPL ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <p className="text-lg">{Number((trade as any).profitLoss ?? (trade as any).unrealizedPL ?? 0) >= 0 ? '+' : ''}{formatCurrency(Number((trade as any).profitLoss ?? (trade as any).unrealizedPL ?? 0))}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-3 text-sm">
                  <div>
                    <p className="text-gray-500">Entry</p>
                    <p className="text-gray-900 font-mono">{formatPrice(Number(trade.openPrice), trade.symbol)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Exit</p>
                    <p className="text-gray-900 font-mono">{formatPrice(Number((trade as any).closePrice ?? trade.currentPrice), trade.symbol)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Lots</p>
                    <p className="text-gray-900">{Number(trade.volume)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Commission</p>
                    <p className="text-gray-900">{formatCurrency(Number(trade.commission || 0))}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <p>Opened: {trade.openedAt ? formatDateTime(String(trade.openedAt)) : '-'}</p>
                  <p>Closed: {(trade as any).closedAt ? formatDateTime(String((trade as any).closedAt)) : '-'}</p>
                </div>
              </div>
            ))}
            {!tradesLoading && trades.length === 0 && (
              <EmptyState title="No trade history" message="Closed positions will appear here" />
            )}
          </div>
        )}
      </div>
      <PositionsDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        positionId={selectedPosition}
        onClosed={(id) => {
          setOpenPositions(prev => prev.filter(p => String((p as any).id || (p as any)._id) !== String(id)));
          setOpenMeta(m => m ? { ...m, total: Math.max(0, (m.total || 0) - 1) } : m);
        }}
      />
    </div>
  );
}
