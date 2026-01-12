import * as React from "react";
import { currencyToFlag, parsePair } from "../../lib/flags";

export function FlagPair({ pair, size = 28 }: { pair: string; size?: number }) {
  const parsed = parsePair(pair);
  if (!parsed) return null;
  const base = currencyToFlag(parsed.base);
  const quote = currencyToFlag(parsed.quote);
  if (!base && !quote) return null;
  const big = size;
  const small = Math.max(14, Math.floor(size * 0.6));
  return (
    <div style={{ position: "relative", width: big, height: big }} aria-hidden>
      {base ? (
        <span className={`fi fis fi-${base}`} style={{ fontSize: big, borderRadius: big / 2, boxShadow: "0 0 0 1px rgba(0,0,0,0.1)" }} />
      ) : (
        <span style={{ display: "inline-block", width: big, height: big, borderRadius: big / 2, background: "#eee" }} />
      )}
      {quote ? (
        <span className={`fi fis fi-${quote}`} style={{ position: "absolute", right: -2, bottom: -2, fontSize: small, borderRadius: small / 2, boxShadow: "0 0 0 1px rgba(0,0,0,0.1)" }} />
      ) : null}
    </div>
  );
}

