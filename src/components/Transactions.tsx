import { useEffect, useMemo, useState, useRef } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, Gift, Percent } from 'lucide-react';
import { getTransactionsWithMeta, WalletTxn } from '../lib/api/transactions';
import { formatCurrency, formatDateTime } from '../lib/mockData';
import { TransactionFilter } from './TransactionFilter';
import { Skeleton } from './ui/skeleton';
import { EmptyState } from './EmptyState';

type SortOrder = 'asc' | 'desc';

type Props = { onBack?: () => void };

export function Transactions({ onBack }: Props) {
  const [items, setItems] = useState<WalletTxn[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [total, setTotal] = useState<number>(0);
  const [pages, setPages] = useState<number>(0);
  const [type, setType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(25);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [firstIndex, setFirstIndex] = useState(0);
  const [windowSize, setWindowSize] = useState(30);
  const [rowH, setRowH] = useState(110);
  const viewportObsRef = useRef<IntersectionObserver | null>(null);

  const params = useMemo(() => ({ page, limit, sortBy, sortOrder, type: type || undefined, status: status || undefined, startDate: startDate || undefined, endDate: endDate || undefined }), [page, limit, sortBy, sortOrder, type, status, startDate, endDate]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getTransactionsWithMeta(params)
      .then((res) => {
        if (!active) return;
        setItems(res.items || []);
        const p = res.pagination;
        setTotal(p?.total || 0);
        setPages(p?.pages || 0);
        setVisibleCount(Math.min(25, (res.items || []).length));
      })
      .catch((e: any) => {
        if (!active) return;
        const msg = e?.error?.message || e?.message || 'Failed to load transactions';
        setError(msg);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => { active = false; };
  }, [params]);

  useEffect(() => {
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
      if (nearBottom) setVisibleCount((v) => Math.min(v + 25, items.length || v + 25));
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
  }, [items.length, rowH]);

  useEffect(() => {
    if (!listRef.current) return;
    const measure = () => {
      const el = listRef.current!.querySelector('div.bg-white') as HTMLElement | null;
      const h = el?.getBoundingClientRect().height;
      if (h && h > 0) setRowH(Math.round(h));
    };
    requestAnimationFrame(measure);
  }, [items.length, firstIndex, windowSize, visibleCount]);

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
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
      if (nearBottom) setVisibleCount((v) => Math.min(v + 25, items.length || v + 25));
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [items.length]);

  const [debounceTimer, setDebounceTimer] = useState<any>(null);
  const onFilterChange = (next: Partial<{ type: string; status: string; sortBy: string; sortOrder: SortOrder; limit: number; startDate?: string; endDate?: string; search?: string }>) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      if (next.type !== undefined) setType(next.type);
      if (next.status !== undefined) setStatus(next.status);
      if (next.sortBy !== undefined) setSortBy(next.sortBy);
      if (next.sortOrder !== undefined) setSortOrder(next.sortOrder);
      if (next.limit !== undefined) setLimit(next.limit);
      if (next.startDate !== undefined) setStartDate(next.startDate || '');
      if (next.endDate !== undefined) setEndDate(next.endDate || '');
      setPage(1);
    }, 300);
    setDebounceTimer(timer);
  };

  const onApplyClick = () => {
    setPage(1);
  };

  const onResetClick = () => {
    setType('');
    setStatus('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setLimit(25);
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const canPrev = page > 1;
  const canNext = pages > 0 && page < pages;

  return (
    <div className="p-4">
      <TransactionFilter
        value={{ type, status, sortBy, sortOrder, limit, startDate, endDate }}
        onChange={onFilterChange}
        onApply={onApplyClick}
        onReset={onResetClick}
        onBack={onBack}
      />

      {error && (
        <div className="mb-3 bg-red-100 text-red-700 px-3 py-2 rounded" role="alert" aria-live="polite">{error}</div>
      )}

          <div className="space-y-2" ref={listRef}>
            {loading ? (
              <div className="space-y-2" aria-busy="true" aria-live="polite">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-1/3 mb-2" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState title="No transactions found" message="Try changing filters or date range" actionLabel="Reset filters" onAction={onResetClick} />
            ) : (
              (() => {
                const maxCount = Math.min(visibleCount, items.length);
                const start = Math.min(firstIndex, Math.max(0, maxCount - windowSize));
                const end = Math.min(maxCount, start + windowSize);
                const topSpacer = start * rowH;
                const bottomSpacer = (maxCount - end) * rowH;
                const slice = items.slice(0, maxCount).slice(start, end);
                return (
                  <>
                    <div style={{ height: topSpacer }} />
                    {slice.map((transaction) => (
                      <div key={transaction.id} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              transaction.type === 'deposit'
                                ? 'bg-green-100'
                                : transaction.type === 'withdrawal'
                                ? 'bg-blue-100'
                                : transaction.type === 'bonus'
                                ? 'bg-yellow-100'
                                : 'bg-purple-100'
                            }`}>
                              {transaction.type === 'deposit' && <ArrowDownRight className="w-5 h-5 text-green-700" />}
                              {transaction.type === 'withdrawal' && <ArrowUpRight className="w-5 h-5 text-blue-700" />}
                              {transaction.type === 'bonus' && <Gift className="w-5 h-5 text-yellow-700" />}
                              {transaction.type === 'fee' && <Percent className="w-5 h-5 text-purple-700" />}
                              {(transaction.type === 'profit_loss' || transaction.type === 'wallet_to_account' || transaction.type === 'account_to_wallet') && <ArrowLeftRight className="w-5 h-5 text紫-700" />}
                            </div>
                            <div>
                              <p className="text-gray-900">
                                {transaction.type === 'profit_loss'
                                  ? `Trade ${transaction.symbol} • ${transaction.volume ?? 0} lots @ ${transaction.price ?? ''}`
                                  : transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                              </p>
                              <p className="text-xs text-gray-500">{transaction.accountNumber ? `Account ${transaction.accountNumber}` : ''}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {(() => {
                              const isDebit = transaction.direction === 'debit' || transaction.type === 'fee' || transaction.netAmount < 0;
                              const sign = isDebit ? '-' : '+';
                              const amt = Math.abs(transaction.netAmount);
                              return (
                                <p className={isDebit ? 'text-red-600' : 'text-green-600'}>
                                  {sign}{formatCurrency(amt, transaction.currency)}
                                </p>
                              );
                            })()}
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              transaction.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : transaction.status === 'pending'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {transaction.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">{formatDateTime(transaction.createdAt)}</p>
                      </div>
                    ))}
                    <div style={{ height: bottomSpacer }} />
                  </>
                );
              })()
            )}
          </div>

      <div className="mt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs sm:text-sm text-gray-600">
            {total > 0 ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total} • Page ${page}/${pages || 1}` : ''}
          </div>
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <button disabled={!canPrev} onClick={() => canPrev && setPage(page - 1)} className={`px-3 py-2 rounded w-full sm:w-auto ${canPrev ? 'bg-white text-gray-900 border' : 'bg-gray-100 text-gray-400'}`}>Prev</button>
            <button disabled={!canNext} onClick={() => canNext && setPage(page + 1)} className={`px-3 py-2 rounded w-full sm:w-auto ${canNext ? 'bg-white text-gray-900 border' : 'bg-gray-100 text-gray-400'}`}>Next</button>
            <button disabled={!canPrev} onClick={() => setPage(1)} className={`hidden sm:inline-flex px-3 py-2 rounded ${canPrev ? 'bg-white text-gray-900 border' : 'bg-gray-100 text-gray-400'}`}>First</button>
            <button disabled={!canNext} onClick={() => pages && setPage(pages)} className={`hidden sm:inline-flex px-3 py-2 rounded ${canNext ? 'bg-white text-gray-900 border' : 'bg-gray-100 text-gray-400'}`}>Last</button>
          </div>
        </div>
      </div>
    </div>
  );
}
