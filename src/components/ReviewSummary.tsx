'use client';

import React from 'react';
import { GameReviewReport, MoveClassification } from '@/types/chess';
import { CLASSIFICATION_META } from '@/lib/engine/classifier';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Target, Send, RotateCcw, TrendingUp } from 'lucide-react';

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
  const { t } = useTranslation();
  const {
    metadata,
    whiteAccuracy,
    blackAccuracy,
    whiteEstimatedElo,
    blackEstimatedElo,
    classificationsCount,
  } = report;

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

  const classKeyMap: Record<MoveClassification, any> = {
    brilliant: 'classBrilliant',
    great: 'classGreat',
    best: 'classBest',
    excellent: 'classExcellent',
    good: 'classGood',
    book: 'classBook',
    inaccuracy: 'classInaccuracy',
    mistake: 'classMistake',
    blunder: 'classBlunder',
    missed_win: 'classMissedWin',
  };

  const totalMistakes =
    (classificationsCount.white.blunder || 0) +
    (classificationsCount.white.mistake || 0) +
    (classificationsCount.white.missed_win || 0) +
    (classificationsCount.black.blunder || 0) +
    (classificationsCount.black.mistake || 0) +
    (classificationsCount.black.missed_win || 0);

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Accuracy & Player Scorecards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* White Player Card */}
        <div className="bg-slate-900/80 border border-white/[0.08] rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-300 inline-block shrink-0" />
                <span className="font-semibold text-xs text-white truncate">
                  {metadata.white.username}
                </span>
              </div>
              {metadata.white.rating && (
                <span className="text-[11px] font-mono text-slate-500">
                  {metadata.white.rating}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-white font-mono tracking-tight">
                {whiteAccuracy}%
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                {t('accuracyTitle')}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-slate-400" />
              {t('perfRating')}
            </span>
            <span className="font-mono text-xs font-semibold text-slate-200">
              {whiteEstimatedElo}
            </span>
          </div>
        </div>

        {/* Black Player Card */}
        <div className="bg-slate-900/80 border border-white/[0.08] rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-600 inline-block shrink-0" />
                <span className="font-semibold text-xs text-white truncate">
                  {metadata.black.username}
                </span>
              </div>
              {metadata.black.rating && (
                <span className="text-[11px] font-mono text-slate-500">
                  {metadata.black.rating}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-white font-mono tracking-tight">
                {blackAccuracy}%
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                {t('accuracyTitle')}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-slate-400" />
              {t('perfRating')}
            </span>
            <span className="font-mono text-xs font-semibold text-slate-200">
              {blackEstimatedElo}
            </span>
          </div>
        </div>
      </div>

      {/* Move Breakdown Matrix */}
      <div className="bg-slate-900/80 border border-white/[0.08] rounded-xl p-3">
        <div className="grid grid-cols-[1fr_45px_45px] text-[10px] font-semibold uppercase tracking-wider text-slate-400 pb-2 border-b border-white/[0.06] px-1">
          <span>{t('classificationBreakdown')}</span>
          <span className="text-center">{t('white')}</span>
          <span className="text-center">{t('black')}</span>
        </div>

        <div className="divide-y divide-white/[0.04] text-xs">
          {classificationOrder.map((type) => {
            const meta = CLASSIFICATION_META[type];
            const wCount = classificationsCount.white[type] || 0;
            const bCount = classificationsCount.black[type] || 0;
            const localizedName = t(classKeyMap[type]);

            return (
              <div
                key={type}
                className="grid grid-cols-[1fr_45px_45px] items-center py-1.5 px-1 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center justify-center min-w-[28px] h-4 px-1 rounded text-[10px] font-mono font-bold"
                    style={{
                      color: meta.color,
                      backgroundColor: `${meta.color}15`,
                      border: `1px solid ${meta.color}30`,
                    }}
                  >
                    {meta.symbol}
                  </span>
                  <span className="text-slate-300 font-medium text-xs">{localizedName}</span>
                </div>
                <span
                  className={`text-center font-mono text-xs ${
                    wCount > 0 ? 'text-slate-200 font-semibold' : 'text-slate-600'
                  }`}
                >
                  {wCount}
                </span>
                <span
                  className={`text-center font-mono text-xs ${
                    bCount > 0 ? 'text-slate-200 font-semibold' : 'text-slate-600'
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
      <div className="space-y-2 pt-1">
        {totalMistakes > 0 && (
          <button
            onClick={onRetryMistakes}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-xs transition-colors"
          >
            <Target className="w-3.5 h-3.5" />
            <span>
              {t('retryActionBtn')} ({totalMistakes})
            </span>
          </button>
        )}

        <button
          onClick={onOpenTelegramModal}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.08] font-semibold text-xs transition-colors"
        >
          <Send className="w-3.5 h-3.5 text-slate-400" />
          <span>{t('openTelegramModal')}</span>
        </button>

        <button
          onClick={onRestartReview}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 text-xs font-medium transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{t('restartReview')}</span>
        </button>
      </div>
    </div>
  );
};
