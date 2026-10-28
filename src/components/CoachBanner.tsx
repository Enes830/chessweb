'use client';

import React, { useState, useEffect } from 'react';
import { MoveAnalysis } from '@/types/chess';
import { CLASSIFICATION_META } from '@/lib/engine/classifier';
import { getMoveExplanation } from '@/lib/coachExplainer';
import { ChevronDown, ChevronUp, Loader2, Info } from 'lucide-react';

interface CoachBannerProps {
  currentMove: MoveAnalysis | null;
  currentPly: number;
  className?: string;
}

export const CoachBanner: React.FC<CoachBannerProps> = ({
  currentMove,
  currentPly,
  className = '',
}) => {
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  useEffect(() => {
    setIsExplaining(false);
    setExplanationText(null);
  }, [currentPly]);

  if (currentPly === 0 || !currentMove) {
    return (
      <div
        className={`bg-slate-900/80 border border-white/[0.08] rounded-xl p-3 flex items-center justify-between text-xs text-slate-400 ${className}`}
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          <span>Starting position. Use left/right arrow keys or click a move below.</span>
        </div>
      </div>
    );
  }

  const meta = CLASSIFICATION_META[currentMove.classification];
  const isOptimal = ['brilliant', 'great', 'best', 'book'].includes(currentMove.classification);

  const handleToggleExplain = async () => {
    if (isExplaining) {
      setIsExplaining(false);
      return;
    }

    setIsExplaining(true);
    if (!explanationText) {
      setIsLoadingExplanation(true);
      try {
        const text = await getMoveExplanation(currentMove);
        setExplanationText(text);
      } catch {
        setExplanationText(currentMove.explanation || 'Move analysis calculated.');
      } finally {
        setIsLoadingExplanation(false);
      }
    }
  };

  return (
    <div
      className={`bg-slate-900/80 border border-white/[0.08] rounded-xl p-3 space-y-2 transition-all ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold"
            style={{
              color: meta.color,
              backgroundColor: `${meta.color}15`,
              border: `1px solid ${meta.color}30`,
            }}
          >
            <span>{meta.symbol}</span>
            <span>{meta.name}</span>
          </span>

          <span className="text-xs sm:text-sm font-medium text-slate-200">
            {currentMove.turn === 'w' ? 'White' : 'Black'} played{' '}
            <span className="font-mono font-semibold text-white">{currentMove.san}</span>
          </span>
        </div>

        <button
          onClick={handleToggleExplain}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-white/[0.06] transition-colors"
        >
          <span>Tactical Context</span>
          {isExplaining ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="font-mono text-[11px]">
          {!isOptimal && currentMove.bestMoveSan && (
            <span className="text-slate-300">
              Optimal: <span className="text-emerald-400 font-semibold">{currentMove.bestMoveSan}</span>
            </span>
          )}
        </div>

        {currentMove.winPctLoss > 0 && (
          <span className="text-slate-500 font-mono text-[11px]">
            Win prob. loss: -{currentMove.winPctLoss.toFixed(1)}%
          </span>
        )}
      </div>

      {isExplaining && (
        <div className="pt-2 border-t border-white/[0.06] text-xs text-slate-300">
          {isLoadingExplanation ? (
            <div className="flex items-center gap-2 py-1 text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing tactical refutation...</span>
            </div>
          ) : (
            <p className="leading-relaxed text-slate-300 font-sans">
              {explanationText || currentMove.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
