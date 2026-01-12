import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { PositionItem } from '../lib/api/positions';
import { validatePosition, ValidationResult } from '../lib/forex-validation';
import { isPositionRisky } from '../lib/position-fix';

interface PositionValidationBannerProps {
  position: PositionItem;
}

export function PositionValidationBanner({ position }: PositionValidationBannerProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isRisky, setIsRisky] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [visible, setVisible] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<number | null>(null);

  useEffect(() => {
    const validationResult = validatePosition({
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
    
    setValidation(validationResult);
    setIsRisky(isPositionRisky(position));
  }, [position]);

  const apiPips = Number(position.pips || 0);
  const apiPL = Number(position.unrealizedPL || 0);
  const apiPct = Number(position.unrealizedPLPercent || 0);
  const hasApiPips = position.pips !== undefined && position.pips !== null;
  let calcPips = 0;
  let calcPL = 0;
  let calcPct = 0;
  let pipsMismatch = false;
  let plMismatch = false;
  let percentMismatch = false;
  if (validation) {
    calcPips = validation.calculated.pips;
    calcPL = validation.calculated.unrealizedPL;
    calcPct = validation.calculated.unrealizedPLPercent;
    const pipsThreshold = Math.max(1, Math.abs(calcPips) * 0.02);
    const plThreshold = Math.max(0.05, Math.abs(calcPL) * 0.03);
    const percentThreshold = Math.max(0.2, Math.abs(calcPct) * 0.05);
    pipsMismatch = hasApiPips && Math.abs(calcPips - apiPips) > pipsThreshold;
    plMismatch = Math.abs(calcPL - apiPL) > plThreshold;
    percentMismatch = Math.abs(calcPct - apiPct) > percentThreshold;
  }
  const hasErrors = validation ? (plMismatch && percentMismatch) : false;
  const hasWarnings = validation ? (validation.warnings.length > 0 || isRisky) : false;

  useEffect(() => {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
    }
    const t = window.setTimeout(() => {
      setVisible(hasErrors || hasWarnings);
    }, hasErrors ? 800 : 1200);
    setDebounceTimer(t as any);
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, [hasErrors, hasWarnings, calcPips, calcPL, calcPct]);

  if (!visible) return null;

  return (
    <div className={`p-3 rounded-lg border ${
      hasErrors 
        ? 'bg-red-50 border-red-200 text-red-800' 
        : 'bg-yellow-50 border-yellow-200 text-yellow-800'
    }`}>
      <div className="flex items-start gap-2">
        {hasErrors ? (
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        ) : (
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">
              {hasErrors ? 'Calculation Error Detected' : 'Position Warning'}
            </h4>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs underline hover:no-underline"
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </button>
          </div>
          
          {hasErrors && (
            <p className="text-sm mt-1">
              This position has incorrect calculations from the server.
            </p>
          )}
          
          {hasWarnings && !hasErrors && (
            <p className="text-sm mt-1">
              This position shows unusual values that may indicate system issues.
            </p>
          )}

          {showDetails && (
            <div className="mt-2 space-y-1 text-xs">
              {validation.errors.map((error, index) => (
                <div key={index} className="flex items-start gap-1">
                  <span className="text-red-600">•</span>
                  <span>{error}</span>
                </div>
              ))}
              
              {validation.warnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-1">
                  <span className="text-yellow-600">•</span>
                  <span>{warning}</span>
                </div>
              ))}
              
              {isRisky && (
                <div className="flex items-start gap-1">
                  <span className="text-red-600">•</span>
                  <span>Position shows high risk indicators</span>
                </div>
              )}
              
              <div className="pt-2 border-t border-current border-opacity-20">
                <p className="font-medium">Corrected Values:</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <span className="opacity-75">P&L:</span> ${validation.calculated.unrealizedPL.toFixed(2)}
                  </div>
                  <div>
                    <span className="opacity-75">Pips:</span> {validation.calculated.pips.toFixed(2)}
                  </div>
                  <div>
                    <span className="opacity-75">P&L%:</span> {validation.calculated.unrealizedPLPercent.toFixed(2)}%
                  </div>
                </div>
                <p className="font-medium mt-2">Server Values:</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <span className="opacity-75">P&L:</span> ${Number(position.unrealizedPL || 0).toFixed(2)}
                  </div>
                  <div>
                    <span className="opacity-75">Pips:</span> {Number(position.pips || 0).toFixed(2)}
                  </div>
                  <div>
                    <span className="opacity-75">P&L%:</span> {Number(position.unrealizedPLPercent || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
