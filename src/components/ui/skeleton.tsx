import * as React from "react";
import { cn } from "./utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-gray-200 rounded", className)} aria-hidden="true" />;
}

