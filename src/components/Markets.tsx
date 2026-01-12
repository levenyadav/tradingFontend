import { useState, useEffect, useRef } from 'react';
import { Search, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { formatPrice, mockCurrencyPairs } from '../lib/mockData';
import { getWatchlist, addWatchlistSymbol, removeWatchlistSymbol } from '../lib/api/watchlist';
import { getMarketOverview } from '../lib/api/markets';
import { getCache, setCache, getStaleCache } from '../lib/cache';
import { CurrencyPair } from '../types';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { FlagPair } from './ui/flag-pair';
import { playUiSound } from '../lib/sound';
import wsClient from '../lib/ws/client';
import { Skeleton } from './ui/skeleton';
import { EmptyState } from './EmptyState';

interface MarketsProps {
  onSelectPair: (pair: CurrencyPair) => void;
}

export function Markets({ onSelectPair }: MarketsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'forex' | 'commodities' | 'indices' | 'crypto'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [pairs, setPairs] = useState<CurrencyPair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categorySequence = ['all','forex','commodities','indices','crypto'] as const;
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const wl = await getWatchlist();
        setFavorites(wl.map(i => i.symbol));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const cached = getCache<CurrencyPair[]>("market_overview_pairs", 120000);
    if (cached && cached.length && pairs.length === 0) setPairs(cached);
    let active = true;
    (async () => {
      setIsLoading(true);
      try {
        const data = await getMarketOverview();
        if (active) {
          setPairs(data);
          setCache("market_overview_pairs", data);
        }
      } catch (e: any) {
        if (active) {
          const stale = getStaleCache<CurrencyPair[]>("market_overview_pairs") || [];
          if (stale.length && pairs.length === 0) setPairs(stale);
          if (!stale.length && pairs.length === 0) setPairs(mockCurrencyPairs as any);
          setError(e?.message || 'Failed to load markets');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const [subSymbols, setSubSymbols] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [firstIndex, setFirstIndex] = useState(0);
  const [windowSize, setWindowSize] = useState(30);
  const [rowH, setRowH] = useState(120);
  const viewportObsRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Initialize subscription symbols once pairs are loaded
    const base = (pairs.length > 0 ? pairs : []).slice(0, visibleCount).map(p => p.pair.toUpperCase());
    setSubSymbols(base);
  }, [pairs.length, visibleCount]);

  useEffect(() => {
    // Stable subscription effect that does not resubscribe on every tick
    wsClient.connect();
    if (subSymbols.length > 0) wsClient.subscribe({ symbols: subSymbols });

    // Batch UI updates at most once per animation frame for performance
    const pending: Record<string, any> = {};
    let rafId: number | null = null;
    const flush = () => {
      setPairs(prev => {
        if (!prev || prev.length === 0) return prev;
        let next = prev;
        for (const sym of Object.keys(pending)) {
          const p = pending[sym];
          const idx = next.findIndex(x => x.pair === sym);
          if (idx !== -1) {
            const curr = next[idx];
            const updated = {
              ...curr,
              bidPrice: typeof p.bid === 'number' ? p.bid : curr.bidPrice,
              askPrice: typeof p.ask === 'number' ? p.ask : curr.askPrice,
              changePercent24h: typeof p.changePercent === 'number' ? p.changePercent : curr.changePercent24h,
            } as any;
            if (next === prev) next = [...prev];
            next[idx] = updated;
          }
        }
        return next;
      });
      for (const k of Object.keys(pending)) delete pending[k];
      rafId = null;
    };

    const onPrice = (p: any) => {
      const sym = String(p.symbol || '').toUpperCase();
      pending[sym] = p;
      if (rafId == null) rafId = requestAnimationFrame(flush);
    };
    wsClient.on('PRICE_UPDATE', onPrice);

    return () => {
      if (subSymbols.length > 0) wsClient.unsubscribe({ symbols: subSymbols });
      wsClient.off('PRICE_UPDATE', onPrice);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [subSymbols.join(',')]);

  const categories = [
    { id: 'all' as const, label: 'All' },
    { id: 'forex' as const, label: 'Forex' },
    { id: 'commodities' as const, label: 'Commodities' },
    { id: 'indices' as const, label: 'Indices' },
    { id: 'crypto' as const, label: 'Crypto' },
  ];

  const toggleFavorite = async (pair: string) => {
    const symbol = pair.toUpperCase();
    if (favorites.includes(symbol)) {
      setFavorites(prev => prev.filter(p => p !== symbol));
      playUiSound('remove');
      try { await removeWatchlistSymbol(symbol); } catch {}
    } else {
      setFavorites(prev => [...prev, symbol]);
      playUiSound('add');
      try { await addWatchlistSymbol(symbol); } catch {}
    }
  };

  const basePairs = pairs;
  const filteredPairs = basePairs.filter(pair => {
    const matchesSearch = pair.pair.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || pair.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
      if (nearBottom) setVisibleCount(v => Math.min(v + 20, pairs.length || v + 20));
      if (listRef.current) {
        const top = listRef.current.getBoundingClientRect().top + window.scrollY;
        const scrollTop = Math.max(0, window.scrollY - top);
        const idx = Math.floor(scrollTop / Math.max(1, rowH));
        const buffered = Math.max(0, idx - 10);
        setFirstIndex(buffered);
        setWindowSize(30);
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [pairs.length]);

  useEffect(() => {
    if (!listRef.current) return;
    const measure = () => {
      const el = listRef.current!.querySelector('button.w-full') as HTMLElement | null;
      const h = el?.getBoundingClientRect().height;
      if (h && h > 0) setRowH(Math.round(h));
    };
    requestAnimationFrame(measure);
  }, [filteredPairs.length, firstIndex, windowSize, visibleCount]);

  useEffect(() => {
    if (!listRef.current) return;
    viewportObsRef.current?.disconnect();
    const obs = new IntersectionObserver(() => {
      const vh = window.innerHeight;
      const sized = Math.max(10, Math.ceil(vh / Math.max(1, rowH)) + 10);
      setWindowSize(sized);
    });
    obs.observe(listRef.current);
    viewportObsRef.current = obs;
    const onResize = () => {
      const sized = Math.max(10, Math.ceil(window.innerHeight / Math.max(1, rowH)) + 10);
      setWindowSize(sized);
    };
    window.addEventListener('resize', onResize);
    return () => { obs.disconnect(); window.removeEventListener('resize', onResize); };
  }, [rowH]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let sx = 0;
    let sy = 0;
    let dx = 0;
    let dy = 0;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      dx = 0;
      dy = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      dx = e.touches[0].clientX - sx;
      dy = e.touches[0].clientY - sy;
    };
    const onEnd = () => {
      if (Math.abs(dx) > 40 && Math.abs(dy) < 25) {
        const idx = categorySequence.indexOf(activeCategory);
        if (dx < 0) {
          const next = categorySequence[(idx + 1) % categorySequence.length];
          setActiveCategory(next);
        } else {
          const prev = categorySequence[(idx - 1 + categorySequence.length) % categorySequence.length];
          setActiveCategory(prev);
        }
      }
      sx = 0; sy = 0; dx = 0; dy = 0;
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart as any);
      el.removeEventListener('touchmove', onMove as any);
      el.removeEventListener('touchend', onEnd as any);
    };
  }, [activeCategory]);

  useEffect(() => {
    const container = document.querySelector('[role="tablist"][aria-label="Market categories"]') as HTMLElement | null;
    if (!container) return;
    const activeBtn = Array.from(container.querySelectorAll('button')).find((b) => b.getAttribute('aria-pressed') === 'true') as HTMLElement | undefined;
    activeBtn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeCategory]);

  return (
    <div ref={rootRef} className="pb-20 md:pb-8" style={{ touchAction: 'pan-y' }}>
      {/* Search and Filter */}
      <div className="sticky top-14 bg-white border-b border-gray-200 z-30" role="region" aria-label="Markets filters">
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search pairs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-lg"
                aria-label="Search pairs"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4" role="tablist" aria-label="Market categories">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-3 rounded-full whitespace-nowrap transition-colors ${
                  activeCategory === category.id
                    ? 'bg-blue-700 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-pressed={activeCategory === category.id}
                aria-label={`Filter ${category.label}`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pairs List */}
      <div className="p-4">
        {isLoading && (
          <div className="space-y-2" aria-busy="true" aria-live="polite">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-full bg-white rounded-lg p-4 shadow-sm">
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-3 w-1/5" />
              </div>
            ))}
          </div>
        )}
        {error && (
          <div className="text-xs text-red-600 mb-2">{error}</div>
        )}
        {!isLoading && filteredPairs.length === 0 ? (
          <EmptyState
            icon={<Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />}
            title="No pairs found"
            message="Try adjusting your search or filters"
            actionLabel="Reset filters"
            onAction={() => { setSearchQuery(''); setActiveCategory('all'); }}
          />
        ) : (
          <div className="space-y-2" ref={listRef}>
            {(() => {
              const maxCount = Math.min(visibleCount, filteredPairs.length);
              const start = Math.min(firstIndex, Math.max(0, maxCount - windowSize));
              const end = Math.min(maxCount, start + windowSize);
              const topSpacer = start * rowH;
              const bottomSpacer = (maxCount - end) * rowH;
              const slice = filteredPairs.slice(0, maxCount).slice(start, end);
              return (
                <>
                  <div style={{ height: topSpacer }} />
                  {slice.map((pair) => (
                  <div
                    key={pair.pair}
                    onClick={() => onSelectPair(pair)}
                    className="relative w-full bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectPair(pair); } }}
                    aria-label={`${pair.pair} ${formatPrice(typeof (pair as any).mid === 'number' ? (pair as any).mid : (typeof (pair as any).rate === 'number' ? (pair as any).rate : (typeof (pair as any).bidPrice === 'number' ? (pair as any).bidPrice : 0)), pair.pair)}; change ${Number((pair as any).changePercent ?? (pair as any).changePercent24h ?? 0).toFixed(2)} percent`}
                  >
                <div className="flex items-center gap-3">
                  <FlagPair pair={pair.pair} />
                  <div className="flex-1 text-left">
                    <p className="text-gray-900 mb-0.5">{pair.pair}</p>
                    <p className="text-xs text-gray-500">{pair.name}</p>
                  </div>

                  {/* Price and Change */}
                  <div className="text-right">
                    {(() => {
                      const symbol = pair.pair;
                      const livePrice = typeof (pair as any).mid === 'number' ? (pair as any).mid
                        : typeof (pair as any).rate === 'number' ? (pair as any).rate
                        : typeof (pair as any).bidPrice === 'number' ? (pair as any).bidPrice
                        : 0;
                      const pct = typeof (pair as any).changePercent === 'number' ? (pair as any).changePercent
                        : typeof (pair as any).changePercent24h === 'number' ? (pair as any).changePercent24h
                        : 0;
                      return (
                        <>
                          <p className="text-gray-900 font-mono mb-0.5" aria-live="polite">{formatPrice(livePrice, symbol)}</p>
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
                        </>
                      );
                    })()}
                  </div>

                  <div className="w-12 h-8 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(pair.pair); }}
                      aria-label="Toggle favorite"
                      className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 hover:border-gray-300"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          favorites.includes(pair.pair)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Spread Info */}
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs" aria-hidden="true">
                  <span className="text-gray-500">
                    Spread: <span className="text-gray-700">{pair.spread} pips</span>
                  </span>
                  <span className="text-gray-500">
                    24h High: <span className="text-gray-700 font-mono">{formatPrice(pair.high24h, pair.pair)}</span>
                  </span>
                  <span className="text-gray-500">
                    24h Low: <span className="text-gray-700 font-mono">{formatPrice(pair.low24h, pair.pair)}</span>
                  </span>
                </div>
                  </div>
                ))}
                  <div style={{ height: bottomSpacer }} />
                </>
              );
            })()}
          </div>
        )}
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
