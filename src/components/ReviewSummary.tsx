'use client';

import { MoveClassificationIcon } from '@/components/MoveClassificationIcon';

import React from 'react';
import { GameReviewReport, MoveClassification } from '@/types/chess';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Send, RotateCcw } from 'lucide-react';

interface ReviewSummaryProps {
  report: GameReviewReport;
  onOpenTelegramModal: () => void;
  onRestartReview: () => void;
  className?: string;
}

export const ReviewSummary: React.FC<ReviewSummaryProps> = ({
  report,
  onOpenTelegramModal,
  onRestartReview,
  className = '',
}) => {
  const { t } = useTranslation();
  const {
    metadata,
    whiteAccuracy,
    blackAccuracy,
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


        </div>
      </div>

      <p className="text-xs text-slate-400">{t('analysisMethodNote')}</p>

      {/* Move Breakdown Matrix */}
      <div className="bg-slate-900/80 border border-white/[0.08] rounded-xl p-3">
        <div className="grid grid-cols-[1fr_45px_45px] text-[10px] font-semibold uppercase tracking-wider text-slate-400 pb-2 border-b border-white/[0.06] px-1">
          <span>{t('classificationBreakdown')}</span>
          <span className="text-center">{t('white')}</span>
          <span className="text-center">{t('black')}</span>
        </div>

        <div className="divide-y divide-white/[0.04] text-xs">
          {classificationOrder.map((type) => {
            const wCount = classificationsCount.white[type] || 0;
            const bCount = classificationsCount.black[type] || 0;
            const localizedName = t(classKeyMap[type]);

            return (
              <div
                key={type}
                className="grid grid-cols-[1fr_45px_45px] items-center py-1.5 px-1 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MoveClassificationIcon classification={type} size={22} decorative />
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
