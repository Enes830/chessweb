'use client';

import React from 'react';
import { cpToWinPct } from '@/lib/engine/classifier';

interface EvalBarProps {
  scoreCp?: number;
  mate?: number;
  orientation?: 'white' | 'black';
  className?: string;
}

export const EvalBar: React.FC<EvalBarProps> = ({
  scoreCp = 0,
  mate,
  orientation = 'white',
  className = '',
}) => {
  // Format the numerical or mate display score
  let displayScore = '0.0';

  if (mate !== undefined && mate !== null) {
    displayScore = mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  } else if (Math.abs(scoreCp) >= 9000) {
    // Fallback if mate-scaled centipawns passed without mate prop
    const dist = Math.max(1, Math.round((10000 - Math.abs(scoreCp)) / 100));
    displayScore = scoreCp > 0 ? `M${dist}` : `-M${dist}`;
  } else {
    const pawns = scoreCp / 100;
    if (pawns > 0) {
      displayScore = `+${pawns.toFixed(1)}`;
    } else if (pawns < 0) {
      displayScore = pawns.toFixed(1);
    } else {
      displayScore = '0.0';
    }
  }

  // Calculate White's win percentage for bar proportions (0% to 100%)
  let whiteWinPct = 50;
  if (mate !== undefined && mate !== null) {
    whiteWinPct = mate > 0 ? 100 : 0;
  } else {
    whiteWinPct = cpToWinPct(scoreCp);
  }

  // Clamp height between 5% and 95% so the bar label is always readable
  const clampedWhitePct = Math.max(5, Math.min(95, whiteWinPct));

  // Determine top and bottom sections based on board orientation:
  // When orientation is 'white': White is at bottom, Black at top
  // When orientation is 'black': Black is at bottom, White at top
  const isWhiteOnBottom = orientation === 'white';

  // White is winning if mate > 0 or scoreCp > 0
  const isWhiteWinning = (mate !== undefined && mate > 0) || (mate === undefined && scoreCp > 0);
  const isBlackWinning = (mate !== undefined && mate < 0) || (mate === undefined && scoreCp < 0);

  // Top section configuration
  // If isWhiteOnBottom: top is Black, height = (100 - clampedWhitePct)%
  // If !isWhiteOnBottom: top is White, height = clampedWhitePct%
  const topHeightPct = isWhiteOnBottom ? 100 - clampedWhitePct : clampedWhitePct;
  const bottomHeightPct = 100 - topHeightPct;

  const topIsWhite = !isWhiteOnBottom;
  const bottomIsWhite = isWhiteOnBottom;

  // Whether the score text should be rendered in top or bottom
  // Show score in whichever side is winning, or bottom if equal
  const showTextInTop = topIsWhite ? isWhiteWinning : isBlackWinning;
  const showTextInBottom = bottomIsWhite ? isWhiteWinning : (isBlackWinning || (!isWhiteWinning && !isBlackWinning));

  return (
    <div
      className={`relative w-7 sm:w-8 self-stretch rounded-lg overflow-hidden flex flex-col bg-slate-950 border border-white/[0.12] shadow-xl select-none transition-all ${className}`}
      title={`Evaluation: ${displayScore}`}
      aria-label={`Current Evaluation: ${displayScore}`}
    >
      {/* Top section */}
      <div
        className={`w-full transition-[height] duration-300 ease-out flex items-start justify-center pt-1.5 ${
          topIsWhite ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-300'
        }`}
        style={{ height: `${topHeightPct}%` }}
      >
        {showTextInTop && (
          <span className="text-[10px] sm:text-xs font-mono font-bold tracking-tight">
            {displayScore}
          </span>
        )}
      </div>

      {/* Bottom section */}
      <div
        className={`w-full transition-[height] duration-300 ease-out flex items-end justify-center pb-1.5 ${
          bottomIsWhite ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-300'
        }`}
        style={{ height: `${bottomHeightPct}%` }}
      >
        {showTextInBottom && !showTextInTop && (
          <span className="text-[10px] sm:text-xs font-mono font-bold tracking-tight">
            {displayScore}
          </span>
        )}
      </div>
    </div>
  );
};
