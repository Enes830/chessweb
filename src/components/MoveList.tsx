'use client';

import { MoveClassificationIcon } from '@/components/MoveClassificationIcon';

import React, { useEffect, useRef } from 'react';
import { MoveAnalysis } from '@/types/chess';
import { CLASSIFICATION_META } from '@/lib/engine/classifier';
import { useTranslation } from '@/lib/i18n/LanguageContext';

interface MoveListProps {
  moves: MoveAnalysis[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
  className?: string;
}

export const MoveList: React.FC<MoveListProps> = ({
  moves,
  currentPly,
  onSelectPly,
  className = '',
}) => {
  const { t, locale } = useTranslation();
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentPly]);

  if (!moves || moves.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-xs font-mono">
        {locale === 'ar' ? 'لا توجد نقلات محملة.' : 'No moves loaded.'}
      </div>
    );
  }

  // Group moves into pairs
  const rows: { moveNumber: number; white?: MoveAnalysis; black?: MoveAnalysis }[] = [];
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (m.turn === 'w') {
      rows.push({ moveNumber: m.moveNumber, white: m });
    } else {
      if (rows.length > 0 && rows[rows.length - 1].moveNumber === m.moveNumber) {
        rows[rows.length - 1].black = m;
      } else {
        rows.push({ moveNumber: m.moveNumber, black: m });
      }
    }
  }

  const renderBadge = (move?: MoveAnalysis) => {
    if (!move) return null;
    const meta = CLASSIFICATION_META[move.classification];
    if (!meta) return null;

    return <MoveClassificationIcon classification={move.classification} size={20} className="mx-1" />;
  };

  return (
    <div
      className={`overflow-y-auto max-h-[360px] sm:max-h-[460px] rounded-xl border border-white/[0.08] bg-slate-900/80 p-1 text-xs select-none ${className}`}
    >
      <div className="grid grid-cols-[36px_1fr_1fr] text-[10px] font-mono uppercase tracking-wider text-slate-500 py-1.5 px-2 border-b border-white/[0.06] bg-slate-950/60 sticky top-0 z-10 backdrop-blur">
        <span>#</span>
        <span>{t('whiteCol')}</span>
        <span>{t('blackCol')}</span>
      </div>

      <div className="divide-y divide-white/[0.03]">
        {rows.map((row) => {
          const isWhiteActive = row.white?.ply === currentPly;
          const isBlackActive = row.black?.ply === currentPly;

          return (
            <div
              key={`row-${row.moveNumber}`}
              className="grid grid-cols-[36px_1fr_1fr] items-center text-xs py-0.5 px-1 hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-slate-500 font-mono text-[11px] px-1">{row.moveNumber}.</span>

              {/* White Move */}
              {row.white ? (
                <button
                  ref={isWhiteActive ? activeItemRef : null}
                  onClick={() => row.white && onSelectPly(row.white.ply)}
                  className={`flex items-center justify-between px-2 py-1 rounded text-left font-mono transition-colors ${
                    isWhiteActive
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                  dir="ltr"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{row.white.san}</span>
                    <span
                      className="text-[10px] text-emerald-400/80 font-normal truncate"
                      title={`Engine Best: ${row.white.bestMoveSan || row.white.bestMoveUci}`}
                    >
                      ({row.white.bestMoveSan || row.white.bestMoveUci})
                    </span>
                  </div>
                  {renderBadge(row.white)}
                </button>
              ) : (
                <span className="px-2 py-1 text-slate-600 font-mono">...</span>
              )}

              {/* Black Move */}
              {row.black ? (
                <button
                  ref={isBlackActive ? activeItemRef : null}
                  onClick={() => row.black && onSelectPly(row.black.ply)}
                  className={`flex items-center justify-between px-2 py-1 rounded text-left font-mono transition-colors ${
                    isBlackActive
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                  dir="ltr"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{row.black.san}</span>
                    <span
                      className="text-[10px] text-emerald-400/80 font-normal truncate"
                      title={`Engine Best: ${row.black.bestMoveSan || row.black.bestMoveUci}`}
                    >
                      ({row.black.bestMoveSan || row.black.bestMoveUci})
                    </span>
                  </div>
                  {renderBadge(row.black)}
                </button>
              ) : (
                <span className="px-2 py-1 text-slate-600 font-mono">...</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
