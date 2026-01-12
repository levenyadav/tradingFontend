import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { CurrencyPair, OrderFormData } from '../types';
import { formatPrice, formatCurrency } from '../lib/mockData';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { OrderModal } from './OrderModal';
import { TradingViewWidget } from './TradingViewWidget';
import wsClient from '../lib/ws/client';
import { playUiSound } from '../lib/sound';

interface TradingProps {
  pair: CurrencyPair;
  onBack: () => void;
  onPlaceOrder: (order: OrderFormData) => void;
}

export function Trading({ pair, onBack, onPlaceOrder }: TradingProps) {
  const [timeframe] = useState('5m');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDirection, setModalDirection] = useState<'buy' | 'sell'>('buy');
  const [liveBid, setLiveBid] = useState<number>(pair.bidPrice);
  const [liveAsk, setLiveAsk] = useState<number>(pair.askPrice);
  const [changePct, setChangePct] = useState<number>(pair.changePercent24h);
  const [lastMid, setLastMid] = useState<number>(pair.bidPrice);
  const [flashDir, setFlashDir] = useState<'up' | 'down' | null>(null);
  const [liveHigh, setLiveHigh] = useState<number>(pair.high24h);
  const [liveLow, setLiveLow] = useState<number>(pair.low24h);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(56);
  const [bottomBarHeight, setBottomBarHeight] = useState<number>(88);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const priceRef = useRef<HTMLDivElement | null>(null);
  const [priceHeight, setPriceHeight] = useState<number>(120);

  useEffect(() => {}, [pair.pair]);

  useEffect(() => {
    wsClient.connect();
    wsClient.subscribe({ symbol: pair.pair, timeframe });
    const onPrice = (p: any) => {
      if (p.symbol === pair.pair) {
        // Map socket payload to state and animate on rate change
        const nextBid = typeof p.bid === 'number' ? p.bid : liveBid;
        const nextAsk = typeof p.ask === 'number' ? p.ask : liveAsk;
        const nextMid = typeof p.mid === 'number' ? p.mid : (typeof p.bid === 'number' && typeof p.ask === 'number' ? (p.bid + p.ask) / 2 : lastMid);
        const nextHigh = typeof p.high === 'number' ? p.high : (typeof p.high24h === 'number' ? p.high24h : liveHigh);
        const nextLow = typeof p.low === 'number' ? p.low : (typeof p.low24h === 'number' ? p.low24h : liveLow);
        if (nextMid > lastMid) {
          setFlashDir('up');
          window.setTimeout(() => setFlashDir(null), 300);
        } else if (nextMid < lastMid) {
          setFlashDir('down');
          window.setTimeout(() => setFlashDir(null), 300);
        }
        setLastMid(nextMid);
        setLiveBid(nextBid);
        setLiveAsk(nextAsk);
        setLiveHigh(nextHigh);
        setLiveLow(nextLow);
        if (typeof p.changePercent === 'number') setChangePct(p.changePercent);
      }
    };
    const onOrderUpdate = (payload: any) => {
      const s = String((payload && (payload.status || payload.orderStatus)) || '').toLowerCase();
      if (s.includes('execut') || s.includes('filled')) playUiSound('order-success');
      else if (s.includes('cancel') || s.includes('reject')) playUiSound('order-error');
    };
    const onOrderResponse = (payload: any) => {
      const ok = Boolean(payload && (payload.success || payload.status === 'executed' || payload.orderStatus === 'filled'));
      playUiSound(ok ? 'order-success' : 'order-error');
    };
    wsClient.on('PRICE_UPDATE', onPrice);
    wsClient.on('ORDER_UPDATE', onOrderUpdate);
    wsClient.on('order_response', onOrderResponse);
    return () => {
      wsClient.unsubscribe({ symbols: [pair.pair] });
      wsClient.off('PRICE_UPDATE', onPrice);
      wsClient.off('ORDER_UPDATE', onOrderUpdate);
      wsClient.off('order_response', onOrderResponse);
    };
  }, [pair.pair, timeframe]);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const h = headerRef.current?.getBoundingClientRect().height || 56;
      setHeaderHeight(Math.ceil(h));
    };
    updateHeaderHeight();
    const ro = new ResizeObserver(updateHeaderHeight);
    if (headerRef.current) ro.observe(headerRef.current);
    const updatePriceHeight = () => {
      const ph = priceRef.current?.getBoundingClientRect().height || 120;
      setPriceHeight(Math.ceil(ph));
    };
    updatePriceHeight();
    const ro2 = new ResizeObserver(updatePriceHeight);
    if (priceRef.current) ro2.observe(priceRef.current);
    const updateToolbarHeight = () => {
      const tb = toolbarRef.current?.getBoundingClientRect().height || 88;
      setBottomBarHeight(Math.ceil(tb));
    };
    updateToolbarHeight();
    const ro3 = new ResizeObserver(updateToolbarHeight);
    if (toolbarRef.current) ro3.observe(toolbarRef.current);
    return () => {
      ro.disconnect();
      ro2.disconnect();
      ro3.disconnect();
    };
  }, []);

  const handleConfirmOrder = (order: { type: 'market' | 'limit' | 'stop'; direction: 'buy' | 'sell'; lotSize: number; entryPrice?: number; stopLoss?: number; takeProfit?: number; leverage: number }) => {
    onPlaceOrder({
      pair: pair.pair,
      type: order.type,
      direction: order.direction,
      lotSize: order.lotSize,
      entryPrice: order.entryPrice,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      leverage: order.leverage,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div ref={headerRef} className="sticky top-0 z-40" style={{ backgroundColor: '#ef5c2a' }}>
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6 text-white" style={{ color: '#fff' }} />
          </button>
          <h2 className="text-white font-bold" style={{ color: '#fff', fontWeight: 700 }}>{pair.pair}</h2>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Price Display */}
      <div ref={priceRef} className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className={`text-gray-900 font-mono transition ${flashDir === 'up' ? 'bg-green-50' : flashDir === 'down' ? 'bg-red-50' : ''}`} aria-live="polite">{formatPrice(lastMid, pair.pair)}</h1>
            <div className="flex items-center gap-1 mt-1">
              {changePct >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`${changePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center justify-between gap-8 px-3 py-1">
              <div className="flex items-center gap-3">
                <p className="text-gray-500">High</p>
                <p className="text-gray-900 font-mono">{formatPrice(liveHigh, pair.pair)}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-gray-500">Low</p>
                <p className="text-gray-900 font-mono">{formatPrice(liveLow, pair.pair)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-8 px-3 py-1">
              <div className="flex items-center gap-3">
                <p className="text-gray-500">Bid</p>
                <p className={`text-gray-900 font-mono transition ${flashDir === 'up' ? 'text-green-700' : flashDir === 'down' ? 'text-red-700' : ''}`}>{formatPrice(liveBid, pair.pair)}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-gray-500">Ask</p>
                <p className={`text-gray-900 font-mono transition ${flashDir === 'up' ? 'text-green-700' : flashDir === 'down' ? 'text-red-700' : ''}`}>{formatPrice(liveAsk, pair.pair)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart fixed from below header+price to above sticky bar */}
      <div className="fixed inset-x-0" style={{ top: headerHeight + priceHeight, bottom: bottomBarHeight, width: '100%' }}>
        <div className="relative w-full h-full overflow-hidden" role="img" aria-label={`Price chart for ${pair.pair}`} style={{ touchAction: 'none' }}>
          <TradingViewWidget symbol={`FX:${pair.pair.replace('/','')}`} />
        </div>
      </div>
      {/* Sticky action bar */}
      <div ref={toolbarRef} role="toolbar" aria-label="Trade actions" className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur" style={{ padding: 'var(--space-section)', paddingBottom: 'calc(var(--space-section) + env(safe-area-inset-bottom))' }}>
        <div className="max-w-md mx-auto grid grid-cols-2" style={{ gap: 'var(--space-section)' }}>
          <Button onClick={() => { setModalDirection('buy'); setModalOpen(true); }} className="h-12 rounded-[var(--radius-4)] bg-green-600 hover:bg-green-700 text-white">Buy</Button>
          <Button onClick={() => { setModalDirection('sell'); setModalOpen(true); }} className="h-12 rounded-[var(--radius-4)] bg-red-600 hover:bg-red-700 text-white">Sell</Button>
        </div>
      </div>
      <OrderModal open={modalOpen} onOpenChange={setModalOpen} symbol={pair.pair} bid={pair.bidPrice} ask={pair.askPrice} initialDirection={modalDirection} onConfirm={handleConfirmOrder} />
    </div>
  );
}
