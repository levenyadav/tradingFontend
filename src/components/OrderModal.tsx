import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { X, TrendingUp, TrendingDown, DollarSign, Shield } from 'lucide-react';
import { playUiSound } from '../lib/sound';
import ErrorBoundary from './ErrorBoundary';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { formatCurrency } from '../lib/mockData';
import { AnimatePresence, motion } from 'framer-motion';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import wsClient from '../lib/ws/client';
import { placeOrder } from '../lib/api/orders';
import { getAccounts } from '../lib/api/accounts';
import { computePipValueUSD, getPipSize } from '../lib/forex';
import { useAccount } from '../lib/account';

type Order = {
  type: 'market' | 'limit' | 'stop';
  direction: 'buy' | 'sell';
  lotSize: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
};

export function OrderModal({ open, onOpenChange, symbol, bid, ask, initialDirection = 'buy', commissionPerLot = 2.5, contractMultiplier = 100000, accountId, onConfirm }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  symbol: string;
  bid: number;
  ask: number;
  initialDirection?: 'buy' | 'sell';
  commissionPerLot?: number;
  contractMultiplier?: number;
  accountId?: string;
  onConfirm: (order: Order) => void;
}) {
  const { selectedAccountId: globalAccountId, accounts } = useAccount();
  const [type, setType] = useState<'market' | 'limit' | 'stop'>('market');
  const [direction, setDirection] = useState<'buy' | 'sell'>(initialDirection);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lotSize, setLotSize] = useState(0.01);
  const [entryPrice, setEntryPrice] = useState<number | undefined>(undefined);
  const [userEditedEntryPrice, setUserEditedEntryPrice] = useState(false);
  const [sl, setSl] = useState<number | undefined>(undefined);
  const [tp, setTp] = useState<number | undefined>(undefined);
  const [accountLeverage, setAccountLeverage] = useState<number>(100);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(accountId || null);
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<string | null>(null);
  const [viewportH, setViewportH] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [liveBid, setLiveBid] = useState<number>(bid);
  const [liveAsk, setLiveAsk] = useState<number>(ask);
  const price = direction === 'buy' ? liveAsk : liveBid;
  const dLot = useDebouncedValue(lotSize, 120);
  const dEntry = useDebouncedValue(entryPrice, 120);
  const { contractValue, marginRequired, estCommission } = useMemo(() => {
    const s = symbol.toUpperCase();
    const isCrypto = s.includes('BTC') || s.includes('ETH') || s.includes('BNB') || s.includes('SOL') || s.includes('ADA') || s.includes('XRP') || s.includes('DOGE');
    const mult = isCrypto ? 1 : contractMultiplier;
    const cv = price * dLot * mult;
    const mr = cv / Math.max(1, accountLeverage);
    const ec = dLot * commissionPerLot;
    return { contractValue: cv, marginRequired: mr, estCommission: ec };
  }, [symbol, price, dLot, accountLeverage, commissionPerLot, contractMultiplier]);

  const confirm = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload: any = {
        accountId: selectedAccountId || accountId || '',
        symbol,
        type,
        direction,
        volume: lotSize,
        comment: 'web',
      };
      if (type !== 'market' && typeof dEntry === 'number') payload.price = dEntry;
      // Allow SL/TP for both market and limit orders
      if (typeof sl === 'number') payload.stopLoss = sl;
      if (typeof tp === 'number') payload.takeProfit = tp;
      if (!payload.accountId) throw new Error('No active account');
      const res = await placeOrder(payload);
      onConfirm({ 
        type, 
        direction, 
        lotSize, 
        entryPrice: type !== 'market' ? dEntry : undefined, 
        stopLoss: sl, 
        takeProfit: tp, 
        leverage: accountLeverage 
      });
      onOpenChange(false);
    } catch (e: any) {
      const details = e?.data?.details;
      const msg = Array.isArray(details) ? details.map((d: any)=>`${d.field}: ${d.message}`).join('; ') : (e?.message || 'Order failed');
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };
  const confirmDisabled = lotSize < 0.01 || (type !== 'market' && !dEntry) || submitting;

  useEffect(() => {
    const vv = (window as any).visualViewport;
    if (!vv) return;
    const handler = () => setViewportH(vv.height);
    handler();
    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, []);

  // Update direction when initialDirection prop changes
  useEffect(() => {
    setDirection(initialDirection);
  }, [initialDirection]);

  useEffect(() => {
    // Prefer global accounts when available
    const acc = (accounts && accounts.length > 0)
      ? accounts.find((a: any) => String(a._id) === String(globalAccountId || accountId || selectedAccountId || '')) || accounts[0]
      : undefined;
    if (acc) {
      setSelectedAccountId(acc._id);
      setSelectedAccountNumber(acc.accountNumber);
      if (typeof acc.leverage === 'number') setAccountLeverage(acc.leverage);
      return;
    }
    // Fallback: fetch if context has no accounts yet
    (async () => {
      try {
        const fetched = await getAccounts('active');
        const acc2 = fetched.find(a => a._id === (globalAccountId || accountId || selectedAccountId || '')) || fetched[0];
        if (!acc2) return;
        setSelectedAccountId(acc2._id);
        setSelectedAccountNumber(acc2.accountNumber);
        if (typeof acc2.leverage === 'number') setAccountLeverage(acc2.leverage);
      } catch {}
    })();
  }, [globalAccountId, accounts?.length, accountId]);

  // Subscribe to live price updates for the symbol
  useEffect(() => {
    wsClient.connect();
    const sym = symbol.toUpperCase();
    wsClient.subscribe({ symbol: sym });
    const onPrice = (p: any) => {
      if (!p || String(p.symbol || '').toUpperCase() !== sym) return;
      const bidNext = typeof p.bid === 'number' ? p.bid : (typeof p.mid === 'number' ? p.mid : liveBid);
      const askNext = typeof p.ask === 'number' ? p.ask : (typeof p.mid === 'number' ? p.mid : liveAsk);
      setLiveBid(bidNext);
      setLiveAsk(askNext);
    };
    wsClient.on('PRICE_UPDATE', onPrice);
    return () => {
      wsClient.off('PRICE_UPDATE', onPrice);
    };
  }, [symbol]);

  // Auto-prefill and refresh entry price for Limit/Stop orders using current market price
  useEffect(() => {
    if (type === 'limit') {
      if (!userEditedEntryPrice) setEntryPrice(price);
      const t = setInterval(() => {
        if (!userEditedEntryPrice) setEntryPrice(price);
      }, 500);
      return () => clearInterval(t);
    }
  }, [type, price, userEditedEntryPrice]);

  const ContentBody = (
    <div className="space-y-4">
      {/* Error Alert */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-900 font-medium" role="alert">
          {errorMsg}
        </div>
      )}

      {/* Order Type Selector */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-2 block">Order Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['market', 'limit'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-3 rounded-lg font-medium capitalize transition-all ${
                type === t
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Direction Selector */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-2 block">Direction</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDirection('buy')}
            className={`px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
              direction === 'buy'
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Buy
          </button>
          <button
            onClick={() => setDirection('sell')}
            className={`px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
              direction === 'sell'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Sell
          </button>
        </div>
      </div>

      {/* Entry Price (for Limit/Stop orders) */}
      {type !== 'market' && (
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Entry Price</Label>
          <div className="space-y-2">
            <Input
              type="number"
              value={entryPrice ?? ''}
              onChange={(e) => {
                setUserEditedEntryPrice(true);
                setEntryPrice(e.target.value ? parseFloat(e.target.value) : undefined);
              }}
              placeholder={price.toFixed(5)}
              className="font-mono text-base h-12"
            />
            <p className="text-xs text-gray-500">
              Current: <span className="font-mono font-medium">{price.toFixed(5)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Lot Size */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-2 block">Volume (Lots)</Label>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-center gap-4 mb-3">
            <button
              onClick={() => setLotSize(Math.max(0.01, parseFloat((lotSize - 0.01).toFixed(2))))}
              className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
              aria-label="Decrease"
            >
              −
            </button>
            <div className="text-center min-w-[100px]">
              <p className="text-3xl font-bold text-gray-900">{lotSize.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Lots</p>
            </div>
            <button
              onClick={() => setLotSize(parseFloat((lotSize + 0.01).toFixed(2)))}
              className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
              aria-label="Increase"
            >
              +
            </button>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">
              ≈ <span className="font-semibold text-gray-900">{formatCurrency(contractValue)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stop Loss & Take Profit - Always visible */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors mb-2"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Stop Loss & Take Profit {(sl || tp) && <span className="text-green-600">(Set)</span>}
            </span>
          </div>
          <span className="text-gray-500">{showAdvanced ? '▼' : '▶'}</span>
        </button>
        
        {showAdvanced && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Stop Loss</Label>
              <Input
                type="number"
                value={sl ?? ''}
                onChange={(e) => setSl(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Optional"
                className="font-mono text-sm h-10"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Take Profit</Label>
              <Input
                type="number"
                value={tp ?? ''}
                onChange={(e) => setTp(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Optional"
                className="font-mono text-sm h-10"
              />
            </div>
          </div>
        )}
      </div>

      {/* Order Summary */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Order Summary</h3>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-sm text-gray-600">Leverage</span>
            <span className="text-sm font-semibold text-gray-900">1:{accountLeverage}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-sm text-gray-600">Required Margin</span>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(marginRequired)}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-sm text-gray-600">Estimated Fee</span>
            <span className="text-sm font-medium text-gray-900">{formatCurrency(estCommission)}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-sm text-gray-600">Pip Value</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(computePipValueUSD(symbol, lotSize, price))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullscreen className="p-0 flex flex-col" style={{ overflowY: 'scroll', maxHeight: '100%' }}>
        <ErrorBoundary>
          {/* Fixed Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  {direction === 'buy' ? 'Buy' : 'Sell'} {symbol}
                </DialogTitle>
                {selectedAccountNumber && (
                  <p className="text-xs text-gray-500 mt-0.5">Account: {selectedAccountNumber}</p>
                )}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="ml-4 p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
            {ContentBody}
          </div>

          {/* Fixed Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4 shadow-lg">
            <Button
              onClick={() => {
                playUiSound('order-confirm');
                confirm();
              }}
              disabled={confirmDisabled}
              className={`w-full h-12 rounded-lg font-semibold text-white text-base transition-all ${
                direction === 'buy'
                  ? 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                  : 'bg-red-600 hover:bg-red-700 active:bg-red-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                <span>
                  {direction === 'buy' ? 'Buy' : 'Sell'} {lotSize.toFixed(2)} Lots
                  {type !== 'market' && dEntry ? ` @ ${dEntry.toFixed(5)}` : ''}
                </span>
              )}
            </Button>
          </div>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
