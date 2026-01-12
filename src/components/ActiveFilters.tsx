import { X } from 'lucide-react';

type Props = {
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  onRemove: (key: 'type' | 'status' | 'dateRange') => void;
  onClearAll: () => void;
};

export function ActiveFilters({ type, status, startDate, endDate, onRemove, onClearAll }: Props) {
  const hasDate = !!startDate || !!endDate;
  const hasAny = !!type || !!status || hasDate;
  if (!hasAny) return null;
  return (
    <div className="flex items-center flex-wrap gap-2 mb-3">
      {type && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-900">
          Type: {type}
          <button className="text-gray-600" onClick={() => onRemove('type')}>
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
      {status && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-900">
          Status: {status}
          <button className="text-gray-600" onClick={() => onRemove('status')}>
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
      {hasDate && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-900">
          Range: {(startDate || '').toString()} – {(endDate || '').toString()}
          <button className="text-gray-600" onClick={() => onRemove('dateRange')}>
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
      <button className="text-xs text-blue-700 hover:text-blue-800" onClick={onClearAll}>Clear All</button>
    </div>
  );
}