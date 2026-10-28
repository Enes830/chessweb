'use client';

import React from 'react';
import { GameReviewReport, MoveClassification } from '@/types/chess';
import { CLASSIFICATION_META } from '@/lib/engine/classifier';
import { Target, Bot, Award, RotateCcw } from 'lucide-react';

interface ReviewSummaryProps {
  report: GameReviewReport;
  onRetryMistakes: () => void;
  onOpenTelegramModal: () => void;
  onRestartReview: () => void;
  className?: string;
}

export const ReviewSummary: React.FC<ReviewSummaryProps> = ({
  report,
  onRetryMistakes,
  onOpenTelegramModal,
  onRestartReview,
  className = '',
}) => {
  const { metadata, whiteAccuracy, blackAccuracy, whiteEstimatedElo, blackEstimatedElo, classificationsCount, puzzles } = report;

  const classificationOrder: MoveClassification[] = [
    'brilliant',
    'great',
    'best',
    'excellent',
    'good',
    'book',
    'inaccuracy',
    'mistake',
    'blunder',
    'missed_win',
  ];

  const totalMistakes =
    (classificationsCount.white.blunder || 0) +
    (classificationsCount.white.mistake || 0) +
    (classificationsCount.white.missed_win || 0) +
    (classificationsCount.black.blunder || 0) +
    (classificationsCount.black.mistake || 0) +
    (classificationsCount.black.missed_win || 0);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Accuracy & Player Scorecards */}
      <div className="grid grid-cols-2 gap-3">
        {/* White Player Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 border border-slate-400 inline-block shrink-0" />
                <span className="font-bold text-sm text-white truncate max-w-[120px]">
                  {metadata.white.username}
                </span>
              </div>
              {metadata.white.rating && (
                <span className="text-xs font-mono font-medium text-slate-400">
                  {metadata.white.rating}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                {whiteAccuracy}%
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                Accuracy
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Est. Elo
            </span>
            <span className="font-mono font-bold text-amber-300">
              {whiteEstimatedElo}
            </span>
          </div>
        </div>

        {/* Black Player Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-600 inline-block shrink-0" />
                <span className="font-bold text-sm text-white truncate max-w-[120px]">
                  {metadata.black.username}
                </span>
              </div>
              {metadata.black.rating && (
                <span className="text-xs font-mono font-medium text-slate-400">
                  {metadata.black.rating}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                {blackAccuracy}%
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase">
                Accuracy
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Est. Elo
            </span>
            <span className="font-mono font-bold text-amber-300">
              {blackEstimatedElo}
            </span>
          </div>
        </div>
      </div>

      {/* Move Breakdown Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg">
        <div className="grid grid-cols-[1fr_50px_50px] text-[11px] font-semibold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800 px-2">
          <span>Classification</span>
          <span className="text-center">White</span>
          <span className="text-center">Black</span>
        </div>

        <div className="divide-y divide-slate-800/40 text-xs font-sans">
          {classificationOrder.map((type) => {
            const meta = CLASSIFICATION_META[type];
            const wCount = classificationsCount.white[type] || 0;
            const bCount = classificationsCount.black[type] || 0;

            if (wCount === 0 && bCount === 0 && (type === 'brilliant' || type === 'great' || type === 'missed_win')) {
              // Show anyway if important or non-zero
            }

            return (
              <div
                key={type}
                className="grid grid-cols-[1fr_50px_50px] items-center py-1.5 px-2 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold"
                    style={{
                      color: meta.color,
                      backgroundColor: `${meta.color}20`,
                      border: `1px solid ${meta.color}40`,
                    }}
                  >
                    {meta.symbol}
                  </span>
                  <span className="text-slate-200 font-medium">{meta.name}</span>
                </div>
                <span
                  className={`text-center font-mono font-semibold ${
                    wCount > 0 ? 'text-slate-200' : 'text-slate-600'
                  }`}
                >
                  {wCount}
                </span>
                <span
                  className={`text-center font-mono font-semibold ${
                    bCount > 0 ? 'text-slate-200' : 'text-slate-600'
                  }`}
                >
                  {bCount}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Actions */}
      <div className="flex flex-col gap-2 pt-1">
        {totalMistakes > 0 && (
          <button
            onClick={onRetryMistakes}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01]"
          >
            <Target className="w-4 h-4" />
            <span>Retry Mistakes ({totalMistakes})</span>
          </button>
        )}

        <button
          onClick={onOpenTelegramModal}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.01]"
        >
          <Bot className="w-4 h-4" />
          <span>Train Mistakes Daily on Telegram</span>
        </button>

        <button
          onClick={onRestartReview}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Review From Move 1</span>
        </button>
      </div>
    </div>
  );
};
