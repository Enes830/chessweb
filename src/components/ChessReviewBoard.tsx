'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { MoveAnalysis } from '@/types/chess';
import { CLASSIFICATION_META } from '@/lib/engine/classifier';
import { EvalBar } from '@/components/EvalBar';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  RotateCcw,
  SkipBack,
  ChevronLeft,
  Play,
  Pause,
  ChevronRight,
  SkipForward,
} from 'lucide-react';

interface Arrow {
  startSquare: string;
  endSquare: string;
  color: string;
}

interface ChessReviewBoardProps {
  moves: MoveAnalysis[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
  orientation?: 'white' | 'black';
  onToggleOrientation?: () => void;
  className?: string;
}

export const ChessReviewBoard: React.FC<ChessReviewBoardProps> = ({
  moves,
  currentPly,
  onSelectPly,
  orientation = 'white',
  onToggleOrientation,
  className = '',
}) => {
  const { t, locale } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);

  const totalPlies = moves.length;
  const currentMove = currentPly > 0 ? moves[currentPly - 1] : null;
  const nextMove = currentPly < totalPlies ? moves[currentPly] : null;

  // Determine current FEN to display on board
  const boardFen = useMemo(() => {
    if (!currentMove) {
      return moves.length > 0 ? moves[0].fenBefore : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    return currentMove.fenAfter;
  }, [currentMove, moves]);

  // Current evaluation for EvalBar
  const currentEvalCp = currentMove ? currentMove.evalAfter : (moves.length > 0 ? moves[0].evalBefore : 0);
  const currentMate = currentMove
    ? (currentMove.isMateAfter ? currentMove.mateAfter : undefined)
    : (moves.length > 0 && moves[0].isMateBefore ? moves[0].mateBefore : undefined);

  // Auto-play interval
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        onSelectPly(currentPly < totalPlies ? currentPly + 1 : 0);
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentPly, totalPlies, onSelectPly]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select, button, a, [contenteditable="true"]')) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        if (currentPly > 0) onSelectPly(currentPly - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        if (currentPly < totalPlies) onSelectPly(currentPly + 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPly, totalPlies, onSelectPly]);

  const customArrows: Arrow[] = useMemo(() => {
    const arrows: Arrow[] = [];

    // At starting position (ply 0), show the engine's best opening move arrow
    if (!currentMove) {
      if (nextMove?.bestMoveUci && nextMove.bestMoveUci.length >= 4) {
        arrows.push({
          startSquare: nextMove.bestMoveUci.slice(0, 2),
          endSquare: nextMove.bestMoveUci.slice(2, 4),
          color: 'rgba(16, 185, 129, 0.92)',
        });
      }
      return arrows;
    }

    const bestUci = currentMove.bestMoveUci || currentMove.uci;
    const isBestPlayed =
      bestUci.length >= 4 && bestUci.slice(0, 4) === currentMove.uci.slice(0, 4);

    // 1. Played move arrow (if different from engine best move, use classification color)
    if (currentMove.from && currentMove.to && !isBestPlayed) {
      const meta = CLASSIFICATION_META[currentMove.classification];
      arrows.push({
        startSquare: currentMove.from,
        endSquare: currentMove.to,
        color: meta.color + 'cc',
      });
    }

    // 2. Engine Best Move arrow (ALWAYS shown on every move in bright emerald green)
    if (bestUci && bestUci.length >= 4) {
      arrows.push({
        startSquare: bestUci.slice(0, 2),
        endSquare: bestUci.slice(2, 4),
        color: 'rgba(16, 185, 129, 0.92)', // Emerald green for top engine move
      });
    }

    return arrows;
  }, [currentMove, nextMove]);

  const squareRenderer = useCallback(
    ({
      square,
      children,
    }: {
      square: string;
      children?: React.ReactNode;
    }) => {
      const isTargetSquare = currentMove && currentMove.to === square;

      return (
        <div className="relative w-full h-full">
          {children}

          {isTargetSquare && (
            <div className="absolute top-1 right-1 z-20 pointer-events-none">
              <span
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-mono font-bold shadow-md"
                style={{
                  backgroundColor: CLASSIFICATION_META[currentMove.classification].color,
                  color: '#ffffff',
                }}
                title={CLASSIFICATION_META[currentMove.classification].name}
              >
                {CLASSIFICATION_META[currentMove.classification].symbol}
              </span>
            </div>
          )}
        </div>
      );
    },
    [currentMove]
  );

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Board & Eval Bar Row */}
      <div className="flex items-stretch justify-center gap-2.5 w-full">
        {/* Vertical Eval Bar */}
        <EvalBar
          scoreCp={currentEvalCp}
          mate={currentMate}
          orientation={orientation}
        />

        {/* Board Container */}
        <div dir="ltr" className="relative w-full max-w-[500px] sm:max-w-[540px] aspect-square rounded-xl overflow-hidden shadow-xl border border-white/[0.08] bg-slate-950">
          <Chessboard
            options={{
              position: boardFen,
              boardOrientation: orientation,
              arrows: customArrows,
              squareRenderer,
              allowDragging: false,
              boardStyle: {
                borderRadius: '12px',
              },
              darkSquareStyle: { backgroundColor: '#739552' },
              lightSquareStyle: { backgroundColor: '#ebecd0' },
            }}
          />
        </div>
      </div>

      {/* Engine Best Move Status Strip (ALWAYS shown on every ply including ply 0) */}
      {(currentMove || nextMove) && (
        <div className="w-full max-w-[500px] sm:max-w-[540px] mt-2 px-3 py-1.5 bg-slate-900/90 border border-white/[0.08] rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-mono shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-sans font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              {locale === 'ar' ? 'أفضل نقلة للمحرك:' : 'Engine Best:'}
            </span>
            <span className="text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30 tracking-wide">
              {currentMove
                ? currentMove.bestMoveSan || currentMove.bestMoveUci || currentMove.san
                : nextMove?.bestMoveSan || nextMove?.bestMoveUci || 'e4'}
            </span>
            {currentMove && (
              currentMove.bestMoveUci.slice(0, 4) === currentMove.uci.slice(0, 4) ? (
                <span className="text-[10px] text-emerald-300 font-sans bg-emerald-500/20 px-1.5 py-0.5 rounded font-semibold border border-emerald-500/30">
                  ✓ {locale === 'ar' ? 'أفضل نقلة ملعوبة' : 'Played'}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-sans">
                  ({locale === 'ar' ? 'لُعبت:' : 'Played:'}{' '}
                  <span className="text-slate-200 font-mono font-semibold">{currentMove.san}</span>)
                </span>
              )
            )}
            {currentMove && nextMove && (nextMove.bestMoveSan || nextMove.bestMoveUci) && (
              <span className="text-[10px] text-slate-400 font-sans pl-1 border-l border-white/[0.08]">
                {locale === 'ar' ? 'الرد الأفضل:' : 'Next Best:'}{' '}
                <span className="text-sky-400 font-mono font-bold">
                  {nextMove.bestMoveSan || nextMove.bestMoveUci}
                </span>
              </span>
            )}
          </div>
          <div className="text-slate-400 text-[11px] shrink-0">
            {locale === 'ar' ? 'التقييم:' : 'Eval:'}{' '}
            <span className="font-semibold text-slate-200">
              {currentMove
                ? currentMove.isMateAfter
                  ? currentMove.mateAfter && currentMove.mateAfter > 0
                    ? `M${currentMove.mateAfter}`
                    : `-M${Math.abs(currentMove.mateAfter || 1)}`
                  : currentMove.evalAfter > 0
                    ? `+${(currentMove.evalAfter / 100).toFixed(1)}`
                    : (currentMove.evalAfter / 100).toFixed(1)
                : '+0.2'}
            </span>
          </div>
        </div>
      )}

      {/* Board Controls Bar */}
      <div className="w-full max-w-[500px] sm:max-w-[540px] mt-2.5 bg-slate-900/80 border border-white/[0.08] rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5">
          {/* Left: Orientation */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleOrientation}
              title={t('flipBoard')}
              aria-label={t('flipBoard')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center: Stepping Controls */}
          <div className="flex items-center gap-0.5" dir="ltr">
            <button
              onClick={() => {
                setIsPlaying(false);
                onSelectPly(0);
              }}
              disabled={currentPly === 0}
              title={t('firstMove')}
              aria-label={t('firstMove')}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                if (currentPly > 0) onSelectPly(currentPly - 1);
              }}
              disabled={currentPly === 0}
              title={t('prevMove')}
              aria-label={t('prevMove')}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              title={isPlaying ? t('pause') : t('autoPlay')}
              aria-label={isPlaying ? t('pause') : t('autoPlay')}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.06] transition-colors mx-1"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                if (currentPly < totalPlies) onSelectPly(currentPly + 1);
              }}
              disabled={currentPly === totalPlies}
              title={t('nextMove')}
              aria-label={t('nextMove')}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                onSelectPly(totalPlies);
              }}
              disabled={currentPly === totalPlies}
              title={t('lastMove')}
              aria-label={t('lastMove')}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Step Counter */}
          <div className="text-[11px] font-mono text-slate-400 px-1" dir="ltr">
            {currentPly}/{totalPlies}
          </div>
        </div>
      </div>
    </div>
  );
};
