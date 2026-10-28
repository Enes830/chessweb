'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import confetti from 'canvas-confetti';
import { MoveAnalysis, MoveClassification } from '@/types/chess';
import { CLASSIFICATION_META } from '@/lib/engine/classifier';
import { EvalBar } from '@/components/EvalBar';
import {
  RotateCcw,
  SkipBack,
  ChevronLeft,
  Play,
  Pause,
  ChevronRight,
  SkipForward,
  Target,
  Sparkles,
  HelpCircle,
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
      // Start position FEN
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

  // Keyboard navigation (ArrowLeft, ArrowRight, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
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

  // Custom Arrows calculation
  const customArrows = useMemo((): Arrow[] => {
    if (isRetryMode) {
      if (showSolution && currentMove) {
        const bestFrom = currentMove.bestMoveUci.slice(0, 2);
        const bestTo = currentMove.bestMoveUci.slice(2, 4);
        return [{ startSquare: bestFrom, endSquare: bestTo, color: 'rgb(34, 197, 94)' }];
      }
      return [];
    }

    if (!currentMove) return [];

    const arrows: Arrow[] = [];
    const playedFrom = currentMove.from;
    const playedTo = currentMove.to;
    const bestUci = currentMove.bestMoveUci;

    const isSuboptimal = [
      'blunder',
      'mistake',
      'inaccuracy',
      'missed_win',
    ].includes(currentMove.classification);

    if (isSuboptimal && bestUci && bestUci.length >= 4) {
      const bestFrom = bestUci.slice(0, 2);
      const bestTo = bestUci.slice(2, 4);

      // Suboptimal played move arrow (Red or Orange)
      arrows.push({
        startSquare: playedFrom,
        endSquare: playedTo,
        color: currentMove.classification === 'blunder' ? 'rgba(239, 68, 68, 0.85)' : 'rgba(245, 158, 11, 0.85)',
      });

      // Best move arrow (Green)
      arrows.push({
        startSquare: bestFrom,
        endSquare: bestTo,
        color: 'rgba(34, 197, 94, 0.9)',
      });
    } else {
      // Good / Best / Brilliant / Book move arrow (Green or Teal)
      const arrowColor =
        currentMove.classification === 'brilliant'
          ? 'rgba(27, 172, 166, 0.9)'
          : 'rgba(34, 197, 94, 0.9)';

      arrows.push({
        startSquare: playedFrom,
        endSquare: playedTo,
        color: arrowColor,
      });
    }

    return arrows;
  }, [currentMove, isRetryMode, showSolution]);

  // Target square and badge for custom square renderer
  const targetSquare = !isRetryMode && currentMove ? currentMove.to : null;
  const currentBadgeMeta = currentMove ? CLASSIFICATION_META[currentMove.classification] : null;

  // Custom square renderer to overlay classification badge on target square
  const squareRenderer = useCallback(
    ({ square, children }: any) => {
      const isTarget = square === targetSquare;

      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {children}
          {isTarget && currentBadgeMeta && (
            <div
              className="absolute top-1 right-1 z-20 flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-full text-[10px] font-black shadow-lg border border-white/80 pointer-events-none select-none transition-transform animate-in zoom-in-50 duration-200"
              style={{
                backgroundColor: currentBadgeMeta.color,
                color: '#ffffff',
              }}
              title={`${currentBadgeMeta.name} (${currentBadgeMeta.symbol})`}
            >
              {currentBadgeMeta.symbol}
            </div>
          )}
        </div>
      );
    },
    [targetSquare, currentBadgeMeta]
  );

  // Handle Retry Mistake Click
  const handleStartRetry = () => {
    if (!currentMove) return;
    setIsPlaying(false);
    setIsRetryMode(true);
    setRetryStatus('idle');
    setShowSolution(false);
    setRetryPositionFen(currentMove.fenBefore);
  };

  const handleCancelRetry = () => {
    setIsRetryMode(false);
    setRetryStatus('idle');
    setShowSolution(false);
    setRetryPositionFen(null);
  };

  // Piece drop handler in Retry Mode
  const handlePieceDrop = ({ piece, sourceSquare, targetSquare }: any): boolean => {
    if (!isRetryMode || !currentMove || !targetSquare) return false;

    try {
      const chess = new Chess(retryPositionFen || currentMove.fenBefore);
      const isPromotion =
        (piece.pieceType === 'p' || piece.pieceType === 'P') &&
        (targetSquare.endsWith('8') || targetSquare.endsWith('1'));

      const moveObj = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: isPromotion ? 'q' : undefined,
      });

      if (!moveObj) return false;

      // Update position on board
      setRetryPositionFen(chess.fen());

      const userUci = `${sourceSquare}${targetSquare}${isPromotion ? 'q' : ''}`;
      const bestUci = currentMove.bestMoveUci;

      if (userUci === bestUci || moveObj.san === currentMove.bestMoveSan) {
        setRetryStatus('success');
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.65 },
        });
        return true;
      } else {
        setRetryStatus('incorrect');
        return true;
      }
    } catch {
      return false;
    }
  };

  const isCurrentMistake =
    currentMove &&
    ['blunder', 'mistake', 'inaccuracy', 'missed_win'].includes(currentMove.classification);

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Board & Eval Bar Row */}
      <div className="flex items-center justify-center gap-3 w-full">
        {/* Vertical Eval Bar */}
        <EvalBar
          scoreCp={currentEvalCp}
          mate={currentMate}
          orientation={orientation}
        />

        {/* Board Container */}
        <div className="relative w-full max-w-[500px] sm:max-w-[540px] aspect-square rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900">
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
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              },
              darkSquareStyle: { backgroundColor: '#779952' },
              lightSquareStyle: { backgroundColor: '#edeed1' },
            }}
          />

          {/* Retry Mode Overlay Banner */}
          {isRetryMode && (
            <div className="absolute top-2 left-2 right-2 z-30 bg-slate-950/90 backdrop-blur border border-amber-500/40 rounded-xl p-3 shadow-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs text-amber-300 uppercase tracking-wider">
                    Retry Mistake Mode
                  </span>
                </div>
                <button
                  onClick={handleCancelRetry}
                  className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
                >
                  Exit
                </button>
              </div>

              <div className="text-xs text-slate-300">
                You played <span className="text-red-400 font-mono font-bold">{currentMove?.san}</span>. Can you find the engine's best move?
              </div>

              {/* Status Feedback */}
              {retryStatus === 'success' && (
                <div className="mt-2 p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-between text-xs text-emerald-300 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Brilliant! You found {currentMove?.bestMoveSan}!</span>
                  </div>
                  <button
                    onClick={handleCancelRetry}
                    className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-[11px]"
                  >
                    Continue
                  </button>
                </div>
              )}

              {retryStatus === 'incorrect' && (
                <div className="mt-2 p-2 rounded-lg bg-red-950/60 border border-red-500/50 flex items-center justify-between text-xs text-red-300">
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>Not the best move. Try again!</span>
                  </div>
                  <button
                    onClick={() => {
                      setRetryPositionFen(currentMove?.fenBefore || null);
                      setRetryStatus('idle');
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px]"
                  >
                    Reset
                  </button>
                </div>
              )}

              {retryStatus !== 'success' && (
                <div className="mt-2 flex items-center justify-end">
                  <button
                    onClick={() => setShowSolution(true)}
                    className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Show Solution ({currentMove?.bestMoveSan})</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Board Controls Bar */}
      <div className="w-full max-w-[500px] sm:max-w-[540px] mt-3 flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 shadow-lg">
        {/* Left: Orientation & Retry */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleOrientation}
            title="Flip Board"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {isCurrentMistake && !isRetryMode && (
            <button
              onClick={handleStartRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-bold transition-all shadow-sm"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Retry Mistake</span>
            </button>
          )}
        </div>

        {/* Center: Stepping Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsPlaying(false);
              setIsRetryMode(false);
              onSelectPly(0);
            }}
            disabled={currentPly === 0}
            title="First Move"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setIsRetryMode(false);
              if (currentPly > 0) onSelectPly(currentPly - 1);
            }}
            disabled={currentPly === 0}
            title="Previous Move (Left Arrow)"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsPlaying((prev) => !prev)}
            title={isPlaying ? 'Pause' : 'Play Auto-Step'}
            className="p-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/40 transition-colors mx-1"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setIsRetryMode(false);
              if (currentPly < totalPlies) onSelectPly(currentPly + 1);
            }}
            disabled={currentPly >= totalPlies}
            title="Next Move (Right Arrow)"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setIsRetryMode(false);
              onSelectPly(totalPlies);
            }}
            disabled={currentPly >= totalPlies}
            title="Last Move"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Ply count */}
        <div className="text-xs font-mono text-slate-400 px-1">
          {currentPly}/{totalPlies}
        </div>
      </div>
    </div>
  );
};
