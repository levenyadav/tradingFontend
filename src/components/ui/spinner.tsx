import * as React from "react";
import { cn } from "./utils";

export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  const dim = `${size}px`;
  return (
    <div
      aria-label="Loading"
      role="status"
      className={cn("inline-block animate-spin", className)}
      style={{ width: dim, height: dim, borderWidth: 2, borderStyle: "solid", borderColor: "currentColor", borderTopColor: "transparent", borderRadius: 9999 }}
    />
  );
}

