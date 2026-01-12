import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, Gift, Calendar } from 'lucide-react';

type SortOrder = 'asc' | 'desc';

type Value = {
  type: string;
  status: string;
  sortBy: string;
  sortOrder: SortOrder;
  limit: number;
  startDate?: string;
  endDate?: string;
};

type Props = {
  value: Value;
  onChange: (next: Partial<Value>) => void;
  onApplyDateRange: (range: { startDate?: string; endDate?: string }) => void;
  onBack?: () => void;
};

export function FilterBar({ value, onChange, onApplyDateRange, onBack }: Props) {
  const [openRange, setOpenRange] = useState(false);
  const [draftStart, setDraftStart] = useState<string>(value.startDate || '');
  const [draftEnd, setDraftEnd] = useState<string>(value.endDate || '');
  const applyRange = () => {
    onApplyDateRange({ startDate: draftStart || undefined, endDate: draftEnd || undefined });
    setOpenRange(false);
  };
  const cancelRange = () => {
    setDraftStart(value.startDate || '');
    setDraftEnd(value.endDate || '');
    setOpenRange(false);
  };
  return (
    <div className="sticky top-14 z-10 bg-gray-50 pt-3 pb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="text-sm text-blue-700 hover:text-blue-800">Back to Wallet</button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select value={value.limit} onChange={(e) => onChange({ limit: Number(e.target.value) })} className="border rounded px-2 py-1 text-gray-900">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <div className="flex border rounded overflow-hidden">
            <button className={`px-2 py-1 ${value.sortBy === 'createdAt' ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600'}`} onClick={() => onChange({ sortBy: 'createdAt' })}>Date</button>
            <button className={`px-2 py-1 ${value.sortBy === 'amount' ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600'}`} onClick={() => onChange({ sortBy: 'amount' })}>Amount</button>
            <button className={`px-2 py-1 ${value.sortBy === 'status' ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600'}`} onClick={() => onChange({ sortBy: 'status' })}>Status</button>
          </div>
          <div className="flex border rounded overflow-hidden">
            <button className={`px-2 py-1 ${value.sortOrder === 'desc' ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600'}`} onClick={() => onChange({ sortOrder: 'desc' })}>Desc</button>
            <button className={`px-2 py-1 ${value.sortOrder === 'asc' ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600'}`} onClick={() => onChange({ sortOrder: 'asc' })}>Asc</button>
          </div>
        </div>
      </div>
      <div className="flex items-center flex-wrap gap-2">
        <button className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${value.type === 'deposit' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-900'}`} onClick={() => onChange({ type: value.type === 'deposit' ? '' : 'deposit' })}><ArrowDownRight className="w-4 h-4" />Deposit</button>
        <button className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${value.type === 'withdrawal' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-900'}`} onClick={() => onChange({ type: value.type === 'withdrawal' ? '' : 'withdrawal' })}><ArrowUpRight className="w-4 h-4" />Withdrawal</button>
        <button className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${value.type === 'wallet_to_account' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-900'}`} onClick={() => onChange({ type: value.type === 'wallet_to_account' ? '' : 'wallet_to_account' })}><ArrowLeftRight className="w-4 h-4" />Wallet → Account</button>
        <button className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${value.type === 'account_to_wallet' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-900'}`} onClick={() => onChange({ type: value.type === 'account_to_wallet' ? '' : 'account_to_wallet' })}><ArrowLeftRight className="w-4 h-4" />Account → Wallet</button>
        <button className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${value.type === 'bonus' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-900'}`} onClick={() => onChange({ type: value.type === 'bonus' ? '' : 'bonus' })}><Gift className="w-4 h-4" />Bonus</button>
        <button className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${value.type === 'profit_loss' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-900'}`} onClick={() => onChange({ type: value.type === 'profit_loss' ? '' : 'profit_loss' })}><ArrowLeftRight className="w-4 h-4" />Profit/Loss</button>
        <div className="flex items-center gap-2 ml-2">
          <div className="flex border rounded overflow-hidden">
            <button className={`px-3 py-1 ${value.status === 'completed' ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600'}`} onClick={() => onChange({ status: value.status === 'completed' ? '' : 'completed' })}>Completed</button>
            <button className={`px-3 py-1 ${value.status === 'pending' ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600'}`} onClick={() => onChange({ status: value.status === 'pending' ? '' : 'pending' })}>Pending</button>
            <button className={`px-3 py-1 ${value.status === 'failed' ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600'}`} onClick={() => onChange({ status: value.status === 'failed' ? '' : 'failed' })}>Failed</button>
          </div>
          <div className="relative">
            <button onClick={() => setOpenRange(!openRange)} className="inline-flex items-center gap-1 px-3 py-1 rounded border bg-white text-gray-900"><Calendar className="w-4 h-4" />Date Range</button>
            {openRange && (
              <div className="absolute mt-2 w-64 bg-white border rounded shadow p-3 z-20">
                <div className="flex items-center gap-2 mb-2">
                  <input type="date" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} className="border rounded px-2 py-1 text-gray-900 w-full" />
                  <input type="date" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} className="border rounded px-2 py-1 text-gray-900 w-full" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <button className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-900" onClick={() => { const d = new Date(); const s = new Date(); s.setDate(d.getDate() - 6); setDraftStart(s.toISOString().slice(0,10)); setDraftEnd(d.toISOString().slice(0,10)); }}>Last 7 days</button>
                  <button className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-900" onClick={() => { const d = new Date(); const s = new Date(); s.setDate(d.getDate() - 29); setDraftStart(s.toISOString().slice(0,10)); setDraftEnd(d.toISOString().slice(0,10)); }}>Last 30 days</button>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button className="text-sm text-gray-700" onClick={cancelRange}>Cancel</button>
                  <button className="text-sm text-blue-700" onClick={applyRange}>Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}