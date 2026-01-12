const map: Record<string, string> = {
  USD: "us",
  EUR: "eu",
  GBP: "gb",
  JPY: "jp",
  CHF: "ch",
  AUD: "au",
  CAD: "ca",
  NZD: "nz",
  CNY: "cn",
  HKD: "hk",
  SGD: "sg",
  SEK: "se",
  NOK: "no",
  TRY: "tr",
  ZAR: "za",
  MXN: "mx",
  PLN: "pl",
  INR: "in",
  BRL: "br",
  KRW: "kr",
};

export function currencyToFlag(code: string): string | null {
  const c = code.toUpperCase();
  return map[c] || null;
}

export function parsePair(pair: string): { base: string; quote: string } | null {
  const parts = pair.split("/");
  if (parts.length !== 2) return null;
  return { base: parts[0].toUpperCase(), quote: parts[1].toUpperCase() };
}
