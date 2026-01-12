import { PositionItem } from '../lib/api/positions';
import { validatePosition } from './forex-validation';

export function fixPositionCalculations(position: PositionItem): PositionItem {
  const validation = validatePosition({
    symbol: position.symbol,
    direction: position.direction,
    volume: position.volume,
    openPrice: position.openPrice,
    currentPrice: position.currentPrice,
    unrealizedPL: position.unrealizedPL || 0,
    margin: position.margin || 0,
    pips: position.pips || 0,
    unrealizedPLPercent: position.unrealizedPLPercent || 0
  });
  
  // If validation fails, use calculated values instead of API values
  if (!validation.isValid) {
    console.warn(`🚨 Fixing incorrect calculations for ${position.symbol}:`, validation.errors);
    
    return {
      ...position,
      unrealizedPL: validation.calculated.unrealizedPL,
      pips: validation.calculated.pips,
      unrealizedPLPercent: validation.calculated.unrealizedPLPercent,
      // Keep original margin for now, but validate it separately
      margin: position.margin || validation.calculated.margin
    };
  }
  
  return position;
}

export function validateAndFixPositions(positions: PositionItem[]): PositionItem[] {
  return positions.map(fixPositionCalculations);
}

export function getPositionWarnings(position: PositionItem): string[] {
  const validation = validatePosition({
    symbol: position.symbol,
    direction: position.direction,
    volume: position.volume,
    openPrice: position.openPrice,
    currentPrice: position.currentPrice,
    unrealizedPL: position.unrealizedPL || 0,
    margin: position.margin || 0,
    pips: position.pips || 0,
    unrealizedPLPercent: position.unrealizedPLPercent || 0
  });
  
  return validation.warnings;
}

export function isPositionRisky(position: PositionItem): boolean {
  // Check for unrealistic values that could indicate system errors
  if (Math.abs(position.unrealizedPL || 0) > 1000000) return true;
  if (Math.abs(position.pips || 0) > 100000) return true;
  if ((position.margin || 0) > 1000000) return true;
  
  // Check for margin call risk (>100% loss)
  if ((position.unrealizedPLPercent || 0) < -90) return true;
  
  return false;
}