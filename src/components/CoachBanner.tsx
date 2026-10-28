'use client';

import React, { useState, useEffect } from 'react';
import { MoveAnalysis } from '@/types/chess';
import { CLASSIFICATION_META } from '@/lib/engine/classifier';
import { getMoveExplanation } from '@/lib/coachExplainer';
import { Sparkles, Bot, ChevronDown, ChevronUp, Loader2, Info } from 'lucide-react';

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

  // Reset explanation state when move changes
  useEffect(() => {
    setIsExplaining(false);
    setExplanationText(null);
  }, [currentPly]);

  if (currentPly === 0 || !currentMove) {
    return (
      <div
        className={`bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs text-slate-300 shadow-md ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Game Review Ready</div>
            <div className="text-slate-400 text-xs">
              Use arrow keys or click any move to explore the Stockfish 19 coach analysis.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const meta = CLASSIFICATION_META[currentMove.classification];
  const isTopMove = ['brilliant', 'great', 'best', 'book'].includes(currentMove.classification);

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
      } catch (e) {
        setExplanationText(currentMove.explanation || 'Move analysis completed.');
      } finally {
        setIsLoadingExplanation(false);
      }
    }
  };

  return (
    <div
      className={`bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5 shadow-lg transition-all ${className}`}
    >
      {/* Top Header: Badge + Played Move vs Best Move */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Classification Badge */}
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm"
            style={{
              color: meta.color,
              backgroundColor: `${meta.color}25`,
              border: `1px solid ${meta.color}50`,
            }}
          >
            <span>{meta.symbol}</span>
            <span>{meta.name}</span>
          </span>

          {/* Move text */}
          <span className="text-xs sm:text-sm font-semibold text-white">
            {currentMove.turn === 'w' ? 'White' : 'Black'} played{' '}
            <span className="font-mono font-bold text-sky-300">{currentMove.san}</span>
          </span>
        </div>

        {/* Action Button: Explain Why */}
        <button
          onClick={handleToggleExplain}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 hover:text-sky-300 border border-sky-500/30 text-xs font-bold transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Explain Why</span>
          {isExplaining ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Comparison Text */}
      <div className="text-xs text-slate-300 flex items-center gap-1.5 flex-wrap">
        {!isTopMove ? (
          <>
            <span className="text-slate-400">Best was</span>
            <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
              {currentMove.bestMoveSan}
            </span>
            <span className="text-slate-400">
              (Win% dropped by{' '}
              <span className="text-red-400 font-semibold">
                {currentMove.winPctLoss.toFixed(1)}%
              </span>
              )
            </span>
          </>
        ) : (
          <span className="text-emerald-400/90 font-medium">
            {currentMove.classification === 'brilliant'
              ? 'Found the brilliant move! High-level tactical sacrifice.'
              : currentMove.classification === 'best'
              ? 'Engine top recommendation.'
              : currentMove.classification === 'book'
              ? `Book move: ${currentMove.openingName || 'Standard Opening'}`
              : 'Crucial tactical find.'}
          </span>
        )}
      </div>

      {/* Expanded Explain Why Panel */}
      {isExplaining && (
        <div className="mt-2 pt-2.5 border-t border-slate-800 text-xs text-slate-200 bg-slate-950/60 p-3 rounded-lg border border-slate-800 animate-in fade-in slide-in-from-top-1">
          {isLoadingExplanation ? (
            <div className="flex items-center gap-2 text-slate-400 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              <span>Analyzing tactical nuances...</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-sky-400 font-bold text-[11px] uppercase tracking-wider">
                <Info className="w-3.5 h-3.5" />
                <span>Coach Insight</span>
              </div>
              <p className="leading-relaxed text-slate-300">
                {explanationText || currentMove.explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
