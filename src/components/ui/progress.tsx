import * as React from "react";
import { cn } from "./utils";

export function Progress({ value = 0, className }: { value?: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 bg-gray-200 rounded", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <div className="h-full bg-blue-600 rounded" style={{ width: `${v}%` }} />
    </div>
  );
}

