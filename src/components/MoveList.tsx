'use client';

import React, { useEffect, useRef } from 'react';
import { MoveAnalysis } from '@/types/chess';
import { CLASSIFICATION_META } from '@/lib/engine/classifier';

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
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll to active move
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
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm italic">
        No moves loaded.
      </div>
    );
  }

  // Group moves into pairs (White move + Black move per moveNumber)
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

    return (
      <span
        title={`${meta.name}: ${meta.description}`}
        className="inline-flex items-center justify-center text-[10px] font-bold px-1 py-0.5 rounded ml-1 transition-transform hover:scale-110 shadow-sm"
        style={{
          color: meta.color,
          backgroundColor: `${meta.color}20`,
          border: `1px solid ${meta.color}50`,
        }}
      >
        {meta.symbol}
      </span>
    );
  };

  return (
    <div
      className={`overflow-y-auto max-h-[360px] sm:max-h-[460px] rounded-lg border border-slate-800 bg-slate-900/60 p-1 text-sm font-sans select-none scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent ${className}`}
    >
      <div className="grid grid-cols-[40px_1fr_1fr] text-xs font-semibold uppercase tracking-wider text-slate-400 py-1.5 px-2 border-b border-slate-800 bg-slate-950/40 sticky top-0 z-10 backdrop-blur">
        <span>#</span>
        <span>White</span>
        <span>Black</span>
      </div>

      <div className="divide-y divide-slate-800/40">
        {rows.map((row) => {
          const isWhiteActive = row.white?.ply === currentPly;
          const isBlackActive = row.black?.ply === currentPly;

          return (
            <div
              key={`row-${row.moveNumber}`}
              className="grid grid-cols-[40px_1fr_1fr] items-center text-xs py-0.5 px-1 hover:bg-slate-800/40 transition-colors"
            >
              <span className="text-slate-500 font-mono pl-1">{row.moveNumber}.</span>

              {/* White Move */}
              {row.white ? (
                <button
                  ref={isWhiteActive ? activeItemRef : null}
                  onClick={() => onSelectPly(row.white!.ply)}
                  className={`flex items-center justify-between px-2 py-1 rounded text-left font-medium transition-all ${
                    isWhiteActive
                      ? 'bg-blue-600/30 text-sky-300 font-bold border border-sky-500/50 shadow-sm'
                      : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className="truncate">{row.white.san}</span>
                  {renderBadge(row.white)}
                </button>
              ) : (
                <span className="px-2 py-1 text-slate-600">...</span>
              )}

              {/* Black Move */}
              {row.black ? (
                <button
                  ref={isBlackActive ? activeItemRef : null}
                  onClick={() => onSelectPly(row.black!.ply)}
                  className={`flex items-center justify-between px-2 py-1 rounded text-left font-medium transition-all ${
                    isBlackActive
                      ? 'bg-blue-600/30 text-sky-300 font-bold border border-sky-500/50 shadow-sm'
                      : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className="truncate">{row.black.san}</span>
                  {renderBadge(row.black)}
                </button>
              ) : (
                <div />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
