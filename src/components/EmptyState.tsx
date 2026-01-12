import { Button } from "./ui/button";
import { cn } from "./ui/utils";

export function EmptyState({ icon, title, message, actionLabel, onAction, className }: { icon?: React.ReactNode; title?: string; message?: string; actionLabel?: string; onAction?: () => void; className?: string }) {
  return (
    <div className={cn("text-center py-12", className)} role="status" aria-live="polite">
      {icon}
      {title ? <p className="text-gray-900 mb-1">{title}</p> : null}
      {message ? <p className="text-sm text-gray-600 mb-3">{message}</p> : null}
      {actionLabel && onAction ? (
        <Button onClick={onAction} className="h-11 rounded-lg bg-blue-600 text-white hover:bg-blue-700">{actionLabel}</Button>
      ) : null}
    </div>
  );
}

