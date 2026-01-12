export function getPipSize(symbol: string): number {
  const s = symbol.toUpperCase();
  
  // CRYPTO pairs (BTC, ETH, etc.) - 1 pip = 1.00
  if (s.includes('BTC') || s.includes('ETH') || s.includes('BNB') || s.includes('SOL')) {
    return 1.0;
  }
  
  // JPY pairs - 0.01
  if (s.includes('JPY')) return 0.01;
  
  // Standard forex pairs - 0.0001
  return 0.0001;
}

export function computePips(symbol: string, direction: string, openPrice: number, currentPrice: number): number {
  const pipSize = getPipSize(symbol);
  if (direction.toLowerCase() === 'buy') {
    return (currentPrice - openPrice) / pipSize;
  }
  return (openPrice - currentPrice) / pipSize;
}

export function computePipValueUSD(symbol: string, volume: number, currentPrice: number): number {
  const s = symbol.toUpperCase();
  const pipSize = getPipSize(symbol);
  
  // CRYPTO pairs - each pip = $1 per unit
  if (s.includes('BTC') || s.includes('ETH') || s.includes('BNB') || s.includes('SOL')) {
    return pipSize * volume; // 1 * volume for crypto
  }
  
  // Standard forex pairs
  if (s.endsWith('/USD')) {
    return 10 * volume; // $10 per pip for 1 lot
  }
  
  if (s.includes('JPY')) {
    return (pipSize * 100000 * volume) / currentPrice;
  }
  
  return 0;
}

export function computeUnrealizedPLUSD(symbol: string, direction: string, openPrice: number, currentPrice: number, volume: number): number {
  const s = symbol.toUpperCase();
  const priceDiff = direction.toLowerCase() === 'buy' ? (currentPrice - openPrice) : (openPrice - currentPrice);
  
  // CRYPTO pairs - direct calculation (1 unit = 1 BTC, ETH, etc.)
  if (s.includes('BTC') || s.includes('ETH') || s.includes('BNB') || s.includes('SOL')) {
    return priceDiff * volume; // volume is in units of crypto
  }
  
  // Standard forex pairs - 100,000 units per lot
  const lotSize = 100000;
  if (s.endsWith('/USD')) {
    return priceDiff * lotSize * volume;
  }
  
  if (s.includes('JPY')) {
    const jpy = priceDiff * lotSize * volume;
    return jpy / currentPrice;
  }
  
  return 0;
}

export function computePLPercent(plUSD: number, margin?: number): number | null {
  if (!margin || margin === 0) return null;
  return (plUSD / margin) * 100;
}