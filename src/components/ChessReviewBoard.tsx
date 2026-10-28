'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import confetti from 'canvas-confetti';
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
  Target,
  CheckCircle2,
  XCircle,
  Lightbulb,
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
  const { t, locale, isRtl } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRetryMode, setIsRetryMode] = useState(false);
  const [retryStatus, setRetryStatus] = useState<'idle' | 'success' | 'incorrect'>('idle');
  const [showSolution, setShowSolution] = useState(false);
  const [retryPositionFen, setRetryPositionFen] = useState<string | null>(null);

  const totalPlies = moves.length;
  const currentMove = currentPly > 0 ? moves[currentPly - 1] : null;

  // Determine current FEN to display on board
  const boardFen = useMemo(() => {
    if (isRetryMode && retryPositionFen) {
      return retryPositionFen;
    }
    if (!currentMove) {
      return moves.length > 0 ? moves[0].fenBefore : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    return currentMove.fenAfter;
  }, [currentMove, moves, isRetryMode, retryPositionFen]);

  // Current evaluation for EvalBar
  const currentEvalCp = currentMove ? currentMove.evalAfter : 0;
  const currentMate = currentMove ? (currentMove.isMateAfter ? currentMove.mateAfter : undefined) : undefined;

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
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setIsRetryMode(false);
        if (currentPly > 0) onSelectPly(currentPly - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setIsRetryMode(false);
        if (currentPly < totalPlies) onSelectPly(currentPly + 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPly, totalPlies, onSelectPly]);

  const handleStartRetry = () => {
    if (!currentMove) return;
    setIsRetryMode(true);
    setRetryStatus('idle');
    setShowSolution(false);
    setRetryPositionFen(currentMove.fenBefore);
    setIsPlaying(false);
  };

  const handleCancelRetry = () => {
    setIsRetryMode(false);
    setRetryStatus('idle');
    setShowSolution(false);
    setRetryPositionFen(null);
  };

  const handlePieceDrop = ({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }) => {
    if (!isRetryMode || !currentMove || !targetSquare) return false;

    try {
      const chess = new Chess(currentMove.fenBefore);
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) return false;

      const userUci = `${sourceSquare}${targetSquare}`;
      const bestUci = currentMove.bestMoveUci ? currentMove.bestMoveUci.slice(0, 4) : '';
      const isCorrect = userUci === bestUci || move.san === currentMove.bestMoveSan;

      if (isCorrect) {
        setRetryPositionFen(chess.fen());
        setRetryStatus('success');
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } else {
        setRetryStatus('incorrect');
      }

      return isCorrect;
    } catch {
      return false;
    }
  };

  const customArrows: Arrow[] = useMemo(() => {
    const arrows: Arrow[] = [];

    if (isRetryMode && showSolution && currentMove?.bestMoveUci) {
      const best = currentMove.bestMoveUci;
      if (best.length >= 4) {
        arrows.push({
          startSquare: best.slice(0, 2),
          endSquare: best.slice(2, 4),
          color: 'rgba(34, 197, 94, 0.85)',
        });
      }
    } else if (!isRetryMode && currentMove) {
      if (currentMove.from && currentMove.to) {
        const meta = CLASSIFICATION_META[currentMove.classification];
        arrows.push({
          startSquare: currentMove.from,
          endSquare: currentMove.to,
          color: meta.color + 'bb',
        });
      }

      const showEngineSuggestion =
        ['blunder', 'mistake', 'missed_win', 'inaccuracy'].includes(
          currentMove.classification
        ) && currentMove.bestMoveUci;

      if (showEngineSuggestion && currentMove.bestMoveUci.length >= 4) {
        arrows.push({
          startSquare: currentMove.bestMoveUci.slice(0, 2),
          endSquare: currentMove.bestMoveUci.slice(2, 4),
          color: 'rgba(34, 197, 94, 0.75)',
        });
      }
    }

    return arrows;
  }, [isRetryMode, showSolution, currentMove]);

  const squareRenderer = useCallback(
    ({
      square,
      children,
    }: {
      square: string;
      children?: React.ReactNode;
    }) => {
      const isTargetSquare = currentMove && currentMove.to === square && !isRetryMode;

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
    [currentMove, isRetryMode]
  );

  const isCurrentMistake =
    currentMove &&
    ['blunder', 'mistake', 'missed_win'].includes(currentMove.classification);

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Board & Eval Bar Row */}
      <div className="flex items-center justify-center gap-2.5 w-full">
        {/* Vertical Eval Bar */}
        <EvalBar
          scoreCp={currentEvalCp}
          mate={currentMate}
          orientation={orientation}
        />

        {/* Board Container */}
        <div className="relative w-full max-w-[500px] sm:max-w-[540px] aspect-square rounded-xl overflow-hidden shadow-xl border border-white/[0.08] bg-slate-950">
          <Chessboard
            options={{
              position: boardFen,
              boardOrientation: orientation,
              arrows: customArrows,
              squareRenderer,
              allowDragging: isRetryMode,
              onPieceDrop: handlePieceDrop,
              boardStyle: {
                borderRadius: '12px',
              },
              darkSquareStyle: { backgroundColor: '#739552' },
              lightSquareStyle: { backgroundColor: '#ebecd0' },
            }}
          />

          {/* Retry Mode Overlay Banner */}
          {isRetryMode && (
            <div className="absolute top-2 left-2 right-2 z-30 bg-slate-950/95 backdrop-blur border border-white/[0.1] rounded-lg p-3 shadow-xl">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-xs text-white">
                    {t('practiceBannerTitle')}
                  </span>
                </div>
                <button
                  onClick={handleCancelRetry}
                  className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-white/[0.06]"
                >
                  {t('close')}
                </button>
              </div>

              <div className="text-xs text-slate-300">
                {locale === 'ar' ? (
                  <>
                    النقلة الملعوبة:{' '}
                    <span className="text-red-400 font-mono font-medium">{currentMove?.san}</span>.
                    ابحث عن البديل الأفضل.
                  </>
                ) : (
                  <>
                    Played move:{' '}
                    <span className="text-red-400 font-mono font-medium">{currentMove?.san}</span>.
                    Find the optimal alternative.
                  </>
                )}
              </div>

              {retryStatus === 'success' && (
                <div className="mt-2 p-2 rounded bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {t('practiceCorrect')} ({currentMove?.bestMoveSan})
                    </span>
                  </div>
                  <button
                    onClick={handleCancelRetry}
                    className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded text-[11px]"
                  >
                    {t('continueReview')}
                  </button>
                </div>
              )}

              {retryStatus === 'incorrect' && (
                <div className="mt-2 p-2 rounded bg-red-950/50 border border-red-500/30 flex items-center justify-between text-xs text-red-300">
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>{t('practiceWrong')}</span>
                  </div>
                  <button
                    onClick={() => {
                      setRetryPositionFen(currentMove?.fenBefore || null);
                      setRetryStatus('idle');
                    }}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[11px] border border-white/[0.06]"
                  >
                    {locale === 'ar' ? 'إعادة' : 'Reset'}
                  </button>
                </div>
              )}

              {retryStatus !== 'success' && (
                <div className="mt-2 flex items-center justify-end">
                  <button
                    onClick={() => setShowSolution(true)}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    <Lightbulb className="w-3 h-3 text-amber-400" />
                    <span>
                      {t('solution')} ({currentMove?.bestMoveSan})
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Board Controls Bar */}
      <div className="w-full max-w-[500px] sm:max-w-[540px] mt-2.5 flex items-center justify-between bg-slate-900/80 border border-white/[0.08] rounded-xl px-2.5 py-1.5">
        {/* Left: Orientation & Retry */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleOrientation}
            title={t('flipBoard')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {isCurrentMistake && !isRetryMode && (
            <button
              onClick={handleStartRetry}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 text-xs font-medium transition-colors"
            >
              <Target className="w-3 h-3" />
              <span>{t('retryMistake')}</span>
            </button>
          )}
        </div>

        {/* Center: Stepping Controls */}
        <div className="flex items-center gap-0.5" dir="ltr">
          <button
            onClick={() => {
              setIsPlaying(false);
              setIsRetryMode(false);
              onSelectPly(0);
            }}
            disabled={currentPly === 0}
            title={t('firstMove')}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setIsRetryMode(false);
              if (currentPly > 0) onSelectPly(currentPly - 1);
            }}
            disabled={currentPly === 0}
            title={t('prevMove')}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying((prev) => !prev)}
            title={isPlaying ? t('pause') : t('autoPlay')}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.06] transition-colors mx-1"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setIsRetryMode(false);
              if (currentPly < totalPlies) onSelectPly(currentPly + 1);
            }}
            disabled={currentPly === totalPlies}
            title={t('nextMove')}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setIsRetryMode(false);
              onSelectPly(totalPlies);
            }}
            disabled={currentPly === totalPlies}
            title={t('lastMove')}
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
  );
};
