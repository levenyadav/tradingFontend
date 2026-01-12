import { getPipSize, computePips, computeUnrealizedPLUSD, computePLPercent } from './forex';

export interface PositionValidation {
  symbol: string;
  direction: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  currentPrice: number;
  unrealizedPL: number;
  margin: number;
  pips: number;
  unrealizedPLPercent: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  calculated: {
    pips: number;
    unrealizedPL: number;
    margin: number;
    unrealizedPLPercent: number;
  };
}

export function validatePosition(pos: PositionValidation): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Calculate correct values
  const calculatedPips = computePips(pos.symbol, pos.direction, pos.openPrice, pos.currentPrice);
  const calculatedPL = computeUnrealizedPLUSD(pos.symbol, pos.direction, pos.openPrice, pos.currentPrice, pos.volume);
  const calculatedPLPercent = computePLPercent(calculatedPL, pos.margin);
  
  // Validate pips calculation
  const hasApiPips = pos.pips !== undefined && pos.pips !== null;
  const pipsDiff = hasApiPips ? Math.abs(calculatedPips - pos.pips) : 0;
  const pipsThreshold = Math.max(1, Math.abs(calculatedPips) * 0.02);
  if (hasApiPips && pipsDiff > pipsThreshold) {
    errors.push(`Pips calculation error: API shows ${pos.pips}, should be ${calculatedPips.toFixed(2)} (diff: ${pipsDiff.toFixed(2)})`);
  }
  
  // Validate P&L calculation
  const plDiff = Math.abs(calculatedPL - pos.unrealizedPL);
  const plThreshold = Math.max(0.05, Math.abs(calculatedPL) * 0.02);
  if (plDiff > plThreshold) {
    errors.push(`P&L calculation error: API shows $${pos.unrealizedPL}, should be $${calculatedPL.toFixed(2)} (diff: $${plDiff.toFixed(2)})`);
  }
  
  // Validate percentage calculation
  if (calculatedPLPercent !== null && pos.unrealizedPLPercent !== null) {
    const percentDiff = Math.abs(calculatedPLPercent - pos.unrealizedPLPercent);
    const percentThreshold = Math.max(0.5, Math.abs(calculatedPLPercent) * 0.05);
    if (percentDiff > percentThreshold) {
      errors.push(`P&L% calculation error: API shows ${pos.unrealizedPLPercent}%, should be ${calculatedPLPercent.toFixed(2)}% (diff: ${percentDiff.toFixed(2)}%)`);
    }
  }
  
  // Sanity checks
  if (pos.unrealizedPL > 1000000) {
    warnings.push(`Unrealistic P&L: $${pos.unrealizedPL.toLocaleString()} - Check position size and calculations`);
  }
  
  if (pos.margin > 1000000) {
    warnings.push(`Unrealistic margin: $${pos.margin.toLocaleString()} - Check leverage and position size`);
  }
  
  if (Math.abs(pos.pips) > 100000) {
    warnings.push(`Unrealistic pips: ${pos.pips.toLocaleString()} - Check pip calculation for ${pos.symbol}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    calculated: {
      pips: calculatedPips,
      unrealizedPL: calculatedPL,
      margin: pos.margin, // Keep original margin for now
      unrealizedPLPercent: calculatedPLPercent || 0
    }
  };
}

export function validateMarginRequirement(symbol: string, volume: number, currentPrice: number, leverage: number = 100): number {
  const s = symbol.toUpperCase();
  
  // For crypto: margin = (price * volume) / leverage
  if (s.includes('BTC') || s.includes('ETH') || s.includes('BNB') || s.includes('SOL')) {
    return (currentPrice * volume) / leverage;
  }
  
  // For forex: margin = (price * volume * 100000) / leverage
  return (currentPrice * volume * 100000) / leverage;
}

export function explainCalculation(symbol: string, direction: string, volume: number, openPrice: number, currentPrice: number): string {
  const s = symbol.toUpperCase();
  const pipSize = getPipSize(symbol);
  const priceDiff = direction === 'buy' ? (currentPrice - openPrice) : (openPrice - currentPrice);
  const pips = computePips(symbol, direction, openPrice, currentPrice);
  const unrealizedPL = computeUnrealizedPLUSD(symbol, direction, openPrice, currentPrice, volume);
  
  let explanation = `
=== CALCULATION BREAKDOWN FOR ${symbol} ===
Direction: ${direction.toUpperCase()}
Volume: ${volume}
Open Price: $${openPrice}
Current Price: $${currentPrice}
Price Difference: $${priceDiff.toFixed(4)}
Pip Size: ${pipSize}
Pips: ${pips.toFixed(2)}
Unrealized P&L: $${unrealizedPL.toFixed(2)}
  `;
  
  if (s.includes('BTC') || s.includes('ETH')) {
    explanation += `
CRYPTO CALCULATION:
- 1 pip = $${pipSize} for ${symbol}
- P&L = Price Difference × Volume
- P&L = $${priceDiff.toFixed(4)} × ${volume} = $${unrealizedPL.toFixed(2)}
    `;
  } else {
    explanation += `
FOREX CALCULATION:
- 1 pip = ${pipSize} for ${symbol}
- P&L = Price Difference × 100,000 × Volume
- P&L = $${priceDiff.toFixed(4)} × 100,000 × ${volume} = $${unrealizedPL.toFixed(2)}
    `;
  }
  
  return explanation;
}
