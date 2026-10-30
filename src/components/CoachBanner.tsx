'use client';

import { MoveClassificationIcon } from '@/components/MoveClassificationIcon';

import React, { useState, useEffect } from 'react';
import { MoveAnalysis, MoveClassification } from '@/types/chess';
import { CLASSIFICATION_META } from '@/lib/engine/classifier';
import { getMoveExplanation, generateHeuristicExplanation } from '@/lib/coachExplainer';
import { useTranslation } from '@/lib/i18n/LanguageContext';
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
  const { t, locale } = useTranslation();
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  useEffect(() => {
    setIsExplaining(false);
    setExplanationText(null);
  }, [currentPly, locale]);

  if (currentPly === 0 || !currentMove) {
    return (
      <div
        className={`bg-slate-900/80 border border-white/[0.08] rounded-xl p-3 flex items-center justify-between text-xs text-slate-400 ${className}`}
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            {locale === 'ar'
              ? 'موقف البداية. استخدم مفاتيح الأسهم أو انقر على النقلات أدناه للتنقل.'
              : 'Starting position. Use left/right arrow keys or click a move below.'}
          </span>
        </div>
      </div>
    );
  }

  const meta = CLASSIFICATION_META[currentMove.classification];
  const isOptimal = ['brilliant', 'great', 'best', 'book'].includes(currentMove.classification);

  // Localized classification name
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
  const localizedClassName = t(classKeyMap[currentMove.classification] || 'classGood');

  const handleToggleExplain = async () => {
    if (isExplaining) {
      setIsExplaining(false);
      return;
    }

    setIsExplaining(true);
    if (!explanationText) {
      setIsLoadingExplanation(true);
      try {
        const text = await getMoveExplanation(currentMove, locale);
        setExplanationText(text);
      } catch {
        setExplanationText(generateHeuristicExplanation(currentMove, locale));
      } finally {
        setIsLoadingExplanation(false);
      }
    }
  };

  const playerColorText = currentMove.turn === 'w' ? t('white') : t('black');

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
            <MoveClassificationIcon classification={currentMove.classification} size={22} decorative />
            <span>{localizedClassName}</span>
          </span>

          <span className="text-xs sm:text-sm font-medium text-slate-200">
            {locale === 'ar' ? (
              <>
                لعب <span className="font-semibold">{playerColorText}</span> نقلة{' '}
                <span className="font-mono font-semibold text-white">{currentMove.san}</span>
              </>
            ) : (
              <>
                {playerColorText} played{' '}
                <span className="font-mono font-semibold text-white">{currentMove.san}</span>
              </>
            )}
          </span>
        </div>

        <button
          onClick={handleToggleExplain}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-white/[0.06] transition-colors"
        >
          <span>{isExplaining ? t('hideTactics') : t('showTactics')}</span>
          {isExplaining ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="font-mono text-[11px]">
          <span className="text-slate-300">
            {t('bestMoveLabel')}{' '}
            <span className="text-emerald-400 font-semibold">
              {currentMove.bestMoveSan || currentMove.bestMoveUci || currentMove.san}
            </span>
            {currentMove.bestMoveUci === currentMove.uci && (
              <span className="ml-1.5 text-[10px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded font-sans font-semibold">
                ✓ {t('classBest')}
              </span>
            )}
          </span>
        </div>

        {currentMove.winPctLoss > 0 && (
          <span className="text-slate-500 font-mono text-[11px]">
            {t('evalLoss')} -{currentMove.winPctLoss.toFixed(1)}%
          </span>
        )}
      </div>

      {isExplaining && (
        <div className="pt-2 border-t border-white/[0.06] text-xs text-slate-300">
          {isLoadingExplanation ? (
            <div className="flex items-center gap-2 py-1 text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>
                {locale === 'ar'
                  ? 'جاري استخراج التحليل التكتيكي...'
                  : 'Analyzing tactical refutation...'}
              </span>
            </div>
          ) : (
            <p className="leading-relaxed text-slate-300 font-sans">
              {explanationText || generateHeuristicExplanation(currentMove, locale)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
