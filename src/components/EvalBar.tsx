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
  // Compute display string
  let displayScore = '0.0';
  let isMate = false;

  if (mate !== undefined && mate !== null) {
    isMate = true;
    displayScore = mate > 0 ? `M${mate}` : `M${Math.abs(mate)}`;
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

  // Calculate White's win percentage for bar height
  let whiteWinPct = 50;
  if (mate !== undefined && mate !== null) {
    whiteWinPct = mate > 0 ? 100 : 0;
  } else {
    whiteWinPct = cpToWinPct(scoreCp);
  }

  // Clamp height between 4% and 96% so the bar label is always readable
  const clampedWhitePct = Math.max(4, Math.min(96, whiteWinPct));

  // Determine height of the white section based on board orientation
  // When orientation is 'white': White is at the bottom, Black at the top
  // When orientation is 'black': Black is at the bottom, White at the top
  const whiteHeightPct = orientation === 'white' ? clampedWhitePct : 100 - clampedWhitePct;
  const isWhiteWinning = (mate !== undefined && mate > 0) || (mate === undefined && scoreCp >= 0);

  return (
    <div
      className={`relative w-8 sm:w-9 h-full min-h-[380px] max-h-[580px] rounded-md overflow-hidden flex flex-col bg-slate-900 border border-slate-700/60 shadow-lg select-none ${className}`}
      title={`Evaluation: ${displayScore}`}
      aria-label={`Current Evaluation: ${displayScore}`}
    >
      {/* Black section (top when white orientation) */}
      <div
        className="w-full bg-slate-950 transition-[height] duration-300 ease-out flex items-start justify-center pt-1"
        style={{ height: `${100 - whiteHeightPct}%` }}
      >
        {!isWhiteWinning && (
          <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-300 tracking-tight">
            {displayScore}
          </span>
        )}
      </div>

      {/* White section (bottom when white orientation) */}
      <div
        className="w-full bg-slate-100 transition-[height] duration-300 ease-out flex items-end justify-center pb-1"
        style={{ height: `${whiteHeightPct}%` }}
      >
        {isWhiteWinning && (
          <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-800 tracking-tight">
            {displayScore}
          </span>
        )}
      </div>
    </div>
  );
};
