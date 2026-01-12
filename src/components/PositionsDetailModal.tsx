import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { formatCurrency, formatPrice, formatDateTime } from "../lib/mockData";
import { closePosition, getPositionDetail, modifyPosition } from "../lib/api/positions";
import { validatePosition } from "../lib/forex-validation";
import { Toast } from "./Toast";
import { getPipSize } from "../lib/forex";
import wsClient from "../lib/ws/client";
import { Spinner } from "./ui/spinner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  positionId: string | null;
  onClosed?: (id: string) => void;
};

export default function PositionsDetailModal({ open, onOpenChange, positionId, onClosed }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const getErrorMessage = (e: any) => {
    if (!e) return 'Request failed';
    const details = e?.error?.details || e?.data?.details;
    if (Array.isArray(details) && details.length) {
      return details.map((d: any) => `${String(d.field || '').trim()}: ${String(d.message || '').trim()}`).join('; ');
    }
    const msg = e?.error?.message || e?.data?.message || e?.data?.error?.message || e?.message;
    return typeof msg === 'string' && msg.trim().length > 0 ? msg : 'Request failed';
  };

  const [closeVolume, setCloseVolume] = useState<number | "">("");
  const [closePrice, setClosePrice] = useState<number | "">("");
  const [closeReason, setCloseReason] = useState<string>("manual");

  const [stopLoss, setStopLoss] = useState<number | "">("");
  const [takeProfit, setTakeProfit] = useState<number | "">("");
  const [trailingStop, setTrailingStop] = useState<number | "">("");
  const [tpTouched, setTpTouched] = useState(false);
  const [slTouched, setSlTouched] = useState(false);
  const [slSelected, setSlSelected] = useState(false);
  const [tpSelected, setTpSelected] = useState(false);
  const [slError, setSlError] = useState<string | null>(null);
  const [tpError, setTpError] = useState<string | null>(null);
  const [riskEdit, setRiskEdit] = useState<'none' | 'sl' | 'tp'>('none');

  const [submittingClose, setSubmittingClose] = useState(false);
  const [submittingModify, setSubmittingModify] = useState(false);
  const [showModify, setShowModify] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  const [tpEnabled, setTpEnabled] = useState(false);
  const [tsEnabled, setTsEnabled] = useState(false);

  const canSubmitClose = useMemo(() => {
    const vol = typeof closeVolume === "number" ? closeVolume : 0;
    const isClosed = String(data?.status || '').toLowerCase() === 'closed';
    return vol > 0 && data && vol <= Number(data.volume || 0) && !isClosed;
  }, [closeVolume, data]);

  useEffect(() => {
    if (!open || !positionId) return;
    setLoading(true);
    setError(null);
    getPositionDetail(positionId)
      .then((res) => {
        setData(res);
        setCloseVolume(res.volume);
      })
      .catch((e) => {
        setError(typeof e?.message === "string" ? e.message : "Failed to load position");
      })
      .finally(() => setLoading(false));
  }, [open, positionId]);
  const metrics = useMemo(() => {
    if (!data) return null;
    return validatePosition({
      symbol: String(data.symbol),
      direction: String(data.direction) as 'buy' | 'sell',
      volume: Number(data.volume),
      openPrice: Number(data.openPrice),
      currentPrice: Number(data.currentPrice),
      unrealizedPL: Number(data.unrealizedPL ?? 0),
      margin: Number(data.margin ?? 0),
      pips: Number(data.pips ?? 0),
      unrealizedPLPercent: Number((data as any).unrealizedPLPercent ?? 0),
    });
  }, [data]);

  const hasRiskValues = useMemo(() => {
    const tp = typeof (data as any)?.takeProfit === 'number' && (data as any)?.takeProfit;
    const sl = typeof (data as any)?.stopLoss === 'number' && (data as any)?.stopLoss;
    return Boolean(tp || sl);
  }, [data]);
  const showRiskCard = showModify || hasRiskValues;

  // Prefill TP/SL with current rate when entering modify mode; enable both inputs
  useEffect(() => {
    if (showModify && data) {
      const cp = Number(data.currentPrice);
      if (takeProfit === "" || typeof takeProfit !== "number") setTakeProfit(cp);
      if (stopLoss === "" || typeof stopLoss !== "number") setStopLoss(cp);
      if (!tpEnabled) setTpEnabled(true);
      if (!slEnabled) setSlEnabled(true);
    }
  }, [showModify, data]);

  useEffect(() => {
    if (!showModify || !data) return;
    const cp = Number(data.currentPrice);
    if (tpSelected && !tpTouched) setTakeProfit(cp);
    if (slSelected && !slTouched) setStopLoss(cp);
  }, [showModify, data?.currentPrice, tpSelected, slSelected, tpTouched, slTouched]);

  useEffect(() => {
    if (showModify) {
      setSlSelected(false);
      setTpSelected(false);
      setTpTouched(false);
      setSlTouched(false);
      setSlError(null);
      setTpError(null);
    }
  }, [showModify]);

  // Realtime price subscription to update current price and recompute P&L
  useEffect(() => {
    if (!open || !data?.symbol) return;
    wsClient.connect();
    const symbol = String(data.symbol).toUpperCase();
    const onPrice = (payload: any) => {
      const sym = String(payload?.symbol || payload?.s || '').toUpperCase();
      if (sym && sym !== symbol) return;
      const price = payload?.price ?? payload?.currentPrice ?? payload?.bid ?? payload?.ask;
      if (typeof price === 'number' && !isNaN(price)) {
        setData((prev: any) => (prev ? { ...prev, currentPrice: Number(price) } : prev));
      }
    };
    const onAny = (evt: any) => {
      const e = evt?.event;
      const p = evt?.payload;
      if (!p) return;
      // Heuristic: treat common price-related events uniformly
      if (typeof e === 'string' && /price|tick|quote/i.test(e)) onPrice(p);
    };
    wsClient.on('prices', onPrice);
    wsClient.on('price_update', onPrice);
    wsClient.on('tick', onPrice);
    wsClient.onAny(onAny);
    wsClient.subscribe({ symbol, channels: ['prices'] });
    return () => {
      wsClient.off('prices', onPrice);
      wsClient.off('price_update', onPrice);
      wsClient.off('tick', onPrice);
      wsClient.offAny(onAny);
      wsClient.unsubscribe({ symbols: [symbol], channels: ['prices'] });
    };
  }, [open, data?.symbol]);

  // Polling fallback: if no socket ticks occur, refresh current price periodically
  useEffect(() => {
    if (!open || !positionId) return;
    let last = Date.now();
    const poll = window.setInterval(async () => {
      const now = Date.now();
      if (now - last > 5000) {
        try {
          const refreshed = await getPositionDetail(positionId);
          setData((prev: any) => (prev ? { ...prev, currentPrice: Number(refreshed.currentPrice) } : refreshed));
          last = Date.now();
        } catch {}
      }
    }, 3000);
    const stop = () => window.clearInterval(poll);
    return stop;
  }, [open, positionId]);

  const ContentBody = (
    <div className="space-y-4">
      {toastMessage && (
        <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
      )}
      {loading && (
        <div className="space-y-4">
          <div className="h-5 bg-gray-200 rounded w-1/3 mx-auto animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      )}
      {error && (
        <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}
      {data && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className={`flex h-8 items-center justify-center rounded-full px-4 ${metrics && metrics.calculated.unrealizedPL >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <p className={`${metrics && metrics.calculated.unrealizedPL >= 0 ? 'text-green-700' : 'text-red-700'} text-sm font-medium`}>{metrics && metrics.calculated.unrealizedPL >= 0 ? 'In Profit' : 'In Loss'}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h1 className={`${metrics && metrics.calculated.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'} text-[32px] font-bold leading-tight pb-1`}>{formatCurrency(Number(metrics?.calculated.unrealizedPL || 0))}</h1>
            <p className="text-gray-600 text-base">Current Market Price: {formatPrice(Number(data.currentPrice), data.symbol)}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex justify-between gap-x-6 py-3 px-3 border-b border-gray-200">
              <p className="text-gray-600 text-sm">Open Price</p>
              <p className="text-gray-900 text-sm font-medium text-right">{formatPrice(Number(data.openPrice), data.symbol)}</p>
            </div>
            <div className="flex justify-between gap-x-6 py-3 px-3 border-b border-gray-200">
              <p className="text-gray-600 text-sm">Volume</p>
              <p className="text-gray-900 text-sm font-medium text-right">{Number(data.volume)} Lot</p>
            </div>
            <div className="flex justify-between gap-x-6 py-3 px-3 border-b border-gray-200">
              <p className="text-gray-600 text-sm">Margin</p>
              <p className="text-gray-900 text-sm font-medium text-right">{formatCurrency(Number(data.margin))}</p>
            </div>
            <div className="flex justify-between gap-x-6 py-3 px-3 border-b border-gray-200">
              <p className="text-gray-600 text-sm">Total Fees</p>
              <p className="text-gray-900 text-sm font-medium text-right">{formatCurrency(Number(data.costs?.total || 0))}</p>
            </div>
            <div className="flex justify-between gap-x-6 py-3 px-3">
              <p className="text-gray-600 text-sm">Open Timestamp</p>
              <p className="text-gray-900 text-sm font-medium text-right">{data.openedAt ? formatDateTime(String(data.openedAt)) : '-'}</p>
            </div>
          </div>

          {showRiskCard && (
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="text-gray-900 text-lg font-bold pb-4">Risk Management</h3>
              {showModify ? (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2 pb-2">
                    <Button variant={slSelected ? 'default' : 'outline'} className="h-10" onClick={() => setSlSelected((v) => !v)}>Set SL</Button>
                    <Button variant={tpSelected ? 'default' : 'outline'} className="h-10" onClick={() => setTpSelected((v) => !v)}>Set TP</Button>
                  </div>
                  <div className={tpSelected ? 'flex flex-col' : 'hidden'}>
                    <Label className="text-gray-600 text-sm pb-1" htmlFor="take-profit">Take Profit</Label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="h-12 w-12" onClick={() => {
                        const step = getPipSize(String(data?.symbol || ''));
                        if (typeof takeProfit === 'number') setTakeProfit(takeProfit - step);
                        else setTakeProfit(Number(data?.currentPrice) - step);
                        setTpTouched(true);
                        setTpError(null);
                      }}>−</Button>
                      <Input id="take-profit" type="number" inputMode="decimal" placeholder="Set Take Profit" value={takeProfit === "" ? "" : String(takeProfit)} onChange={(e) => { setTakeProfit(e.target.value ? Number(e.target.value) : ""); setTpTouched(true); setTpError(null); }} className="flex-1 h-12 rounded-lg bg-white border border-gray-200 px-4 text-green-600 text-base font-medium text-right focus:outline-none focus:ring-2 focus:ring-blue-600" />
                      <Button variant="outline" className="h-12 w-12" onClick={() => {
                        const step = getPipSize(String(data?.symbol || ''));
                        if (typeof takeProfit === 'number') setTakeProfit(takeProfit + step);
                        else setTakeProfit(Number(data?.currentPrice) + step);
                        setTpTouched(true);
                        setTpError(null);
                      }}>+</Button>
                    </div>
                    {tpError && (<p className="text-xs text-red-600 mt-1">{tpError}</p>)}
                  </div>
                  <div className={slSelected ? 'flex flex-col' : 'hidden'}>
                    <Label className="text-gray-600 text-sm pb-1" htmlFor="stop-loss">Stop Loss</Label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="h-12 w-12" onClick={() => {
                        const step = getPipSize(String(data?.symbol || ''));
                        if (typeof stopLoss === 'number') setStopLoss(stopLoss - step);
                        else setStopLoss(Number(data?.currentPrice) - step);
                        setSlTouched(true);
                        setSlError(null);
                      }}>−</Button>
                      <Input id="stop-loss" type="number" inputMode="decimal" placeholder="Set Stop Loss" value={stopLoss === "" ? "" : String(stopLoss)} onChange={(e) => { setStopLoss(e.target.value ? Number(e.target.value) : ""); setSlTouched(true); setSlError(null); }} className="flex-1 h-12 rounded-lg bg-white border border-gray-200 px-4 text-red-600 text-base font-medium text-right focus:outline-none focus:ring-2 focus:ring-blue-600" />
                      <Button variant="outline" className="h-12 w-12" onClick={() => {
                        const step = getPipSize(String(data?.symbol || ''));
                        if (typeof stopLoss === 'number') setStopLoss(stopLoss + step);
                        else setStopLoss(Number(data?.currentPrice) + step);
                        setSlTouched(true);
                        setSlError(null);
                      }}>+</Button>
                    </div>
                    {slError && (<p className="text-xs text-red-600 mt-1">{slError}</p>)}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between gap-x-6 py-2.5 border-b border-gray-200">
                    <p className="text-gray-600 text-sm">Take Profit</p>
                    <p className="text-green-600 text-sm font-medium">{typeof (data as any).takeProfit === 'number' && (data as any).takeProfit ? formatPrice(Number((data as any).takeProfit), (data as any).symbol) : '-'}</p>
                  </div>
                  <div className="flex justify-between gap-x-6 py-2.5">
                    <p className="text-gray-600 text-sm">Stop Loss</p>
                    <p className="text-red-600 text-sm font-medium">{typeof (data as any).stopLoss === 'number' && (data as any).stopLoss ? formatPrice(Number((data as any).stopLoss), (data as any).symbol) : '-'}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullscreen className="p-0">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <span className={`${String(data?.direction).toLowerCase() === 'buy' ? 'text-green-600' : 'text-red-600'}`}>{String(data?.direction).toLowerCase() === 'buy' ? '↑' : '↓'}</span>
            <h2 className="text-lg font-bold text-gray-700">{data?.symbol}</h2>
          </div>
          <Button variant="ghost" className="h-10 w-10 bg-transparent hover:bg-transparent text-gray-600 hover:text-gray-800" onClick={() => onOpenChange(false)}>✕</Button>
        </div>
        <div className="p-4 pb-24 overflow-y-auto h-[calc(100vh-8rem)]">
          {ContentBody}
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
          <div className="flex w-full items-center gap-3">
            {showModify ? (
              <>
              <Button variant="outline" className="flex-1 h-12 rounded-lg border-gray-300 text-gray-700" onClick={() => setShowModify(false)}>Cancel</Button>
              <Button className="flex-1 h-12 rounded-lg bg-blue-600 text-white hover:bg-blue-700" disabled={submittingModify || (!slSelected && !tpSelected)} onClick={async () => {
                if (!positionId) return;
                setSubmittingModify(true);
                setError(null);
                try {
                  await modifyPosition(positionId, {
                    stopLoss: slSelected && typeof stopLoss === 'number' ? stopLoss : undefined,
                    takeProfit: tpSelected && typeof takeProfit === 'number' ? takeProfit : undefined,
                  });
                  const refreshed = await getPositionDetail(positionId);
                  setData(refreshed);
                  setToastType('success');
                  const msg = tpSelected && slSelected
                    ? `Stop Loss and Take Profit updated`
                    : tpSelected
                      ? `Take Profit set to ${formatPrice(Number(takeProfit), String(refreshed.symbol))}`
                      : slSelected
                        ? `Stop Loss set to ${formatPrice(Number(stopLoss), String(refreshed.symbol))}`
                        : 'Position modified successfully';
                  setToastMessage(msg);
                  setShowModify(false);
                } catch (e: any) {
                  const m = getErrorMessage(e);
                  const details = e?.error?.details || e?.data?.details;
                  if (Array.isArray(details)) {
                    const slMsg = details.find((d: any) => String(d.field || '').toLowerCase().includes('stoploss'))?.message;
                    const tpMsg = details.find((d: any) => String(d.field || '').toLowerCase().includes('takeprofit'))?.message;
                    if (slMsg) setSlError(String(slMsg));
                    if (tpMsg) setTpError(String(tpMsg));
                  } else {
                    const lower = String(m || '').toLowerCase();
                    if (lower.includes('stop loss') || lower.includes('stoploss')) setSlError(m);
                    if (lower.includes('take profit') || lower.includes('takeprofit') || lower.includes('tp')) setTpError(m);
                  }
                  setError(m);
                  setToastType('error');
                  setToastMessage(m);
                } finally {
                  setSubmittingModify(false);
                }
              }}>Apply Changes</Button>
              </>
            ) : (
              <>
              <Button className="flex-1 h-12 rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={() => setShowModify(true)}>Modify Position</Button>
              <Button className="flex-1 h-12 rounded-lg bg-gray-200 text-gray-900 hover:bg-gray-300" disabled={!canSubmitClose || submittingClose} onClick={async () => {
                if (!positionId) return;
                setSubmittingClose(true);
                setError(null);
                try {
                  await closePosition(positionId, { volume: typeof closeVolume === "number" ? closeVolume : 0, price: typeof closePrice === "number" ? closePrice : 0, reason: closeReason });
                  const refreshed = await getPositionDetail(positionId);
                  setData(refreshed);
                  setToastType('success');
                  setToastMessage('Your order has been successfully closed');
                  const isClosed = String(refreshed?.status || '').toLowerCase() === 'closed';
                  if (isClosed) {
                    try { if (onClosed) onClosed(positionId); } catch {}
                    try { window.dispatchEvent(new CustomEvent('position.closed', { detail: { id: positionId } })); } catch {}
                    window.setTimeout(() => onOpenChange(false), 1000);
                  }
                } catch (e: any) {
                  const msg = typeof e?.message === 'string' ? e.message : '';
                  if (msg && msg.toLowerCase().includes('already closed')) {
                    setError('Position is already closed');
                    setToastType('info');
                    setToastMessage('Position is already closed');
                  } else {
                    const m = getErrorMessage(e);
                    setError(m);
                    setToastType('error');
                    setToastMessage(m);
                  }
                } finally {
                  setSubmittingClose(false);
                }
              }}>{submittingClose ? (<span className="flex items-center justify-center gap-2"><Spinner size={16} /><span>Closing...</span></span>) : 'Close Position'}</Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
