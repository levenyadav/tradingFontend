import { useEffect, useLayoutEffect, useRef } from 'react';
import { createChart as createChartImport, CrosshairMode } from 'lightweight-charts';
import ErrorBoundary from './ErrorBoundary';

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export function CandleChart({ candles }: { candles: Candle[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const volumeRef = useRef<any>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    containerRef.current.style.touchAction = 'none';
    const Lib: any = (window as any).LightweightCharts ?? { createChart: createChartImport, CrosshairMode };
    const chart = Lib.createChart(containerRef.current, {
      width: Math.max(0, rect.width),
      height: Math.max(240, rect.height),
      layout: { background: { color: '#ffffff' }, textColor: '#1f2937' },
      grid: { vertLines: { color: '#e5e7eb' }, horzLines: { color: '#e5e7eb' } },
      crosshair: { mode: Lib.CrosshairMode?.Normal ?? CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#e5e7eb' },
      timeScale: { borderColor: '#e5e7eb', rightOffset: 8, secondsVisible: false },
    });

    const addCandle = (chart as any).addCandlestickSeries || (chart as any).addSeries;
    const series = addCandle
      ? addCandle.call(chart, { type: 'candlestick', upColor: '#22c55e', downColor: '#ef4444', borderUpColor: '#22c55e', borderDownColor: '#ef4444', wickUpColor: '#22c55e', wickDownColor: '#ef4444' })
      : null;
    if (!series) {
      chartRef.current = chart;
      return;
    }
    series.priceScale().applyOptions({ scaleMargins: { top: 0, bottom: 0.25 } });

    const addHist = (chart as any).addHistogramSeries || (chart as any).addSeries;
    const volume = addHist
      ? addHist.call(chart, { type: 'histogram', color: '#94a3b8', priceFormat: { type: 'volume' } })
      : null;
    if (volume && volume.priceScale) {
      volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    }

    if (candles && candles.length) {
      const priceData = candles.map(c => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close }));
      const volumeData = candles.map(c => ({ time: c.time as any, value: c.volume, color: c.close >= c.open ? '#22c55e' : '#ef4444' }));
      series.setData(priceData);
      volume?.setData(volumeData);
      chart.timeScale().fitContent();
    }

    chartRef.current = chart;
    seriesRef.current = series;
    volumeRef.current = volume;

    const tooltip = document.createElement('div');
    tooltip.className = 'absolute pointer-events-none bg-white/95 text-gray-900 border rounded px-2 py-1 text-xs shadow';
    tooltip.style.display = 'none';
    tooltipRef.current = tooltip;
    containerRef.current.appendChild(tooltip);

    const crosshairHandler = (param: any) => {
      if (!param.point || !param.time || !tooltipRef.current || !seriesRef.current) {
        if (tooltipRef.current) tooltipRef.current.style.display = 'none';
        return;
      }
      const p = param.point;
      const ohlc = param.seriesData.get(seriesRef.current) as any;
      const t = typeof param.time === 'number' ? new Date(param.time * 1000) : null;
      const left = Math.max(0, Math.min(p.x + 8, containerRef.current!.clientWidth - 160));
      const top = Math.max(0, p.y + 8);
      tooltipRef.current.style.left = left + 'px';
      tooltipRef.current.style.top = top + 'px';
      tooltipRef.current.innerHTML = ohlc
        ? `${t ? t.toLocaleString() + '<br/>' : ''}O ${Number(ohlc.open).toFixed(5)} H ${Number(ohlc.high).toFixed(5)} L ${Number(ohlc.low).toFixed(5)} C ${Number(ohlc.close).toFixed(5)}`
        : '';
      tooltipRef.current.style.display = 'block';
    };
    chart.subscribeCrosshairMove(crosshairHandler);

    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      chart.resize(Math.max(0, width), Math.max(0, height));
    });
    ro.observe(containerRef.current);

    let lastX: number | null = null;
    let pinchStartDist: number | null = null;
    let barSpacing = 6;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        lastX = e.touches[0].clientX;
      } else if (e.touches.length === 2) {
        const a = e.touches[0];
        const b = e.touches[1];
        pinchStartDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && lastX != null) {
        const x = e.touches[0].clientX;
        const dx = x - lastX;
        lastX = x;
        chart.timeScale().scrollByPixels(-dx);
        e.preventDefault();
      } else if (e.touches.length === 2 && pinchStartDist != null) {
        const a = e.touches[0];
        const b = e.touches[1];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const delta = dist - pinchStartDist;
        pinchStartDist = dist;
        barSpacing = Math.max(4, Math.min(25, barSpacing + delta * 0.02));
        chart.timeScale().applyOptions({ barSpacing });
        e.preventDefault();
      }
    };
    const onTouchEnd = () => { lastX = null; pinchStartDist = null; };
    containerRef.current.addEventListener('touchstart', onTouchStart, { passive: false });
    containerRef.current.addEventListener('touchmove', onTouchMove, { passive: false });
    containerRef.current.addEventListener('touchend', onTouchEnd);

    return () => {
      chart.unsubscribeCrosshairMove(crosshairHandler);
      if (tooltipRef.current && tooltipRef.current.parentElement) tooltipRef.current.parentElement.removeChild(tooltipRef.current);
      ro.disconnect();
      if (containerRef.current) {
        containerRef.current.removeEventListener('touchstart', onTouchStart as any);
        containerRef.current.removeEventListener('touchmove', onTouchMove as any);
        containerRef.current.removeEventListener('touchend', onTouchEnd as any);
      }
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeRef.current = null;
      tooltipRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current && candles && candles.length) {
      const priceData = candles.map(c => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close }));
      const volumeData = candles.map(c => ({ time: c.time as any, value: c.volume, color: c.close >= c.open ? '#22c55e' : '#ef4444' }));
      seriesRef.current.setData(priceData);
      volumeRef.current?.setData(volumeData);
      chartRef.current?.timeScale().fitContent();
    }
  }, [candles]);

  return (
    <ErrorBoundary>
      <div className="bg-white border rounded-lg h-full">
        <div ref={containerRef} className="relative w-full h-full min-h-[240px] overflow-hidden" role="img" aria-label="Price chart">
          {(!candles || candles.length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm" role="status" aria-live="polite">
              No data
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
