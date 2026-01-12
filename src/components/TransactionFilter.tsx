import { useState } from 'react';
import { Calendar, Search } from 'lucide-react';

type SortOrder = 'asc' | 'desc';

type Value = {
  type: string;
  status: string;
  sortBy: string;
  sortOrder: SortOrder;
  limit: number;
  startDate?: string;
  endDate?: string;
  search?: string;
};

type Props = {
  value: Value;
  onChange: (next: Partial<Value>) => void;
  onApply: () => void;
  onReset: () => void;
  onBack?: () => void;
};

export function TransactionFilter({ value, onChange, onApply, onReset, onBack }: Props) {
  const [openRange, setOpenRange] = useState(false);
  const [draftStart, setDraftStart] = useState<string>(value.startDate || '');
  const [draftEnd, setDraftEnd] = useState<string>(value.endDate || '');
  const applyRange = () => {
    onChange({ startDate: draftStart || undefined, endDate: draftEnd || undefined });
    setOpenRange(false);
  };
  const quickDays = (days: number) => {
    const d = new Date();
    const s = new Date();
    s.setDate(d.getDate() - (days - 1));
    setDraftStart(s.toISOString().slice(0, 10));
    setDraftEnd(d.toISOString().slice(0, 10));
  };
  return (
    <div className="bg-gray-50">
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-gray-900">Filter Transactions</h3>
          {onBack && (
            <button onClick={onBack} className="text-sm text-blue-700">Back</button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="relative">
            <button onClick={() => setOpenRange(!openRange)} className="w-full inline-flex items-center justify-between px-3 py-2 rounded bg-white border text-gray-900">
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4" />Date Range</span>
              <span className="text-xs text-gray-600">{value.startDate || ''}{value.startDate || value.endDate ? ' – ' : ''}{value.endDate || ''}</span>
            </button>
            {openRange && (
              <div className="absolute left-0 right-0 mt-2 bg-white border rounded shadow p-3 z-20">
                <div className="flex items-center gap-2 mb-2">
                  <input type="date" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} className="border rounded px-2 py-1 text-gray-900 w-full" />
                  <input type="date" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} className="border rounded px-2 py-1 text-gray-900 w-full" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <button className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-900" onClick={() => quickDays(7)}>Last 7 days</button>
                  <button className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-900" onClick={() => quickDays(30)}>Last 30 days</button>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button className="text-sm text-gray-700" onClick={() => setOpenRange(false)}>Cancel</button>
                  <button className="text-sm text-blue-700" onClick={applyRange}>Apply</button>
                </div>
              </div>
            )}
          </div>
          <select value={value.type} onChange={(e) => onChange({ type: e.target.value })} className="w-full border rounded px-3 py-2 text-gray-900 bg-white">
            <option value="">All Types</option>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="profit_loss">Trade</option>
          </select>
          <select value={value.status} onChange={(e) => onChange({ status: e.target.value })} className="w-full border rounded px-3 py-2 text-gray-900 bg-white">
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <div className="flex items-center gap-2">
            <select value={value.sortBy} onChange={(e) => onChange({ sortBy: e.target.value })} className="w-full border rounded px-3 py-2 text-gray-900 bg-white">
              <option value="createdAt">Date</option>
              <option value="amount">Amount</option>
              <option value="status">Status</option>
            </select>
            <select value={value.sortOrder} onChange={(e) => onChange({ sortOrder: e.target.value as SortOrder })} className="w-full border rounded px-3 py-2 text-gray-900 bg-white">
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select value={value.limit} onChange={(e) => onChange({ limit: Number(e.target.value) })} className="w-full border rounded px-3 py-2 text-gray-900 bg-white">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-500" />
              <input value={value.search || ''} onChange={(e) => onChange({ search: e.target.value })} placeholder="Search" className="w-full border rounded pl-7 pr-2 py-2 text-gray-900 bg-white" />
            </div>
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 bg-gray-50 border-t px-4 py-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button onClick={onApply} className="w-full px-3 py-2 rounded bg-blue-700 text-white">Apply Filter</button>
          <button onClick={onReset} className="w-full px-3 py-2 rounded border bg-white text-gray-900">Reset</button>
        </div>
      </div>
    </div>
  );
}

