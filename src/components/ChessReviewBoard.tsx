'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import type { PieceDropHandlerArgs, SquareHandlerArgs } from 'react-chessboard';
import { MoveAnalysis, VariationMove, EngineEvalResult } from '@/types/chess';
import { CLASSIFICATION_META } from '@/lib/engine/classifier';
import { getStockfishClient } from '@/lib/engine/workerClient';
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
  GitBranch,
  X,
  PlayCircle,
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

  // Variation state
  const [isVariationActive, setIsVariationActive] = useState(false);
  const [variationRootPly, setVariationRootPly] = useState(0);
  const [variationMoves, setVariationMoves] = useState<VariationMove[]>([]);
  const [variationIndex, setVariationIndex] = useState(0); // 0 = at root FEN, 1 = after 1st move...
  const [liveEval, setLiveEval] = useState<EngineEvalResult | null>(null);
  const [isEvaluatingLive, setIsEvaluatingLive] = useState(false);

  // Click-to-move square selection
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalTargetSquares, setLegalTargetSquares] = useState<string[]>([]);

  const totalPlies = moves.length;
  const currentMove = currentPly > 0 ? moves[currentPly - 1] : null;
  const nextMove = currentPly < totalPlies ? moves[currentPly] : null;

  // Determine current game FEN
  const gameFen = useMemo(() => {
    if (!currentMove) {
      return moves.length > 0 ? moves[0].fenBefore : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    return currentMove.fenAfter;
  }, [currentMove, moves]);

  // When parent changes currentPly, reset any active variation
  useEffect(() => {
    setIsVariationActive(false);
    setVariationMoves([]);
    setVariationIndex(0);
    setLiveEval(null);
    setSelectedSquare(null);
    setLegalTargetSquares([]);
  }, [currentPly]);

  // Active FEN displayed on the board
  const displayedFen = useMemo(() => {
    if (!isVariationActive) return gameFen;
    if (variationIndex === 0) {
      const baseMove = variationRootPly > 0 ? moves[variationRootPly - 1] : null;
      return baseMove ? baseMove.fenAfter : (moves.length > 0 ? moves[0].fenBefore : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    }
    return variationMoves[variationIndex - 1]?.fenAfter || gameFen;
  }, [isVariationActive, variationIndex, variationMoves, variationRootPly, gameFen, moves]);

  // Centipawns & mate evaluations for EvalBar
  const currentEvalCp = useMemo(() => {
    if (isVariationActive) {
      return liveEval?.scoreCp ?? 0;
    }
    return currentMove ? currentMove.evalAfter : (moves.length > 0 ? moves[0].evalBefore : 0);
  }, [isVariationActive, liveEval, currentMove, moves]);

  const currentMate = useMemo(() => {
    if (isVariationActive) {
      return liveEval?.mate;
    }
    return currentMove
      ? (currentMove.isMateAfter ? currentMove.mateAfter : undefined)
      : (moves.length > 0 && moves[0].isMateBefore ? moves[0].mateBefore : undefined);
  }, [isVariationActive, liveEval, currentMove, moves]);

  // Live Stockfish Evaluation during Variation Mode
  useEffect(() => {
    if (!isVariationActive || !displayedFen) return;

    let isSubscribed = true;
    setIsEvaluatingLive(true);

    const client = getStockfishClient();
    client
      .evaluateLivePosition(displayedFen, 14, 3, (partial) => {
        if (isSubscribed) {
          setLiveEval(partial);
        }
      })
      .then((final) => {
        if (isSubscribed) {
          setLiveEval(final);
          setIsEvaluatingLive(false);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setIsEvaluatingLive(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [isVariationActive, displayedFen]);

  // Auto-play interval for main game review
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && !isVariationActive) {
      timer = setInterval(() => {
        onSelectPly(currentPly < totalPlies ? currentPly + 1 : 0);
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isPlaying, isVariationActive, currentPly, totalPlies, onSelectPly]);

  // Convert engine best UCI move into SAN
  const variationBestSan = useMemo(() => {
    if (!isVariationActive || !liveEval?.bestMove || liveEval.bestMove.length < 4 || !displayedFen) {
      return '';
    }
    try {
      const probe = new Chess(displayedFen);
      const m = probe.move({
        from: liveEval.bestMove.slice(0, 2),
        to: liveEval.bestMove.slice(2, 4),
        promotion: liveEval.bestMove[4] || 'q',
      });
      return m ? m.san : liveEval.bestMove;
    } catch {
      return liveEval.bestMove;
    }
  }, [isVariationActive, liveEval?.bestMove, displayedFen]);

  // Execute a piece move (from drag or click)
  const handleMakeMove = useCallback(
    (from: string, to: string, promotion: string = 'q'): boolean => {
      const currentBoardFen = displayedFen;
      let chessInstance: Chess;
      try {
        chessInstance = new Chess(currentBoardFen);
      } catch {
        return false;
      }

      let moveResult;
      try {
        moveResult = chessInstance.move({ from, to, promotion });
      } catch {
        return false;
      }
      if (!moveResult) return false;

      // 1. If not currently in variation, check if this matches the actual game move
      if (!isVariationActive && currentPly < totalPlies) {
        const nextGameMove = moves[currentPly];
        const playedUci = `${moveResult.from}${moveResult.to}${moveResult.promotion || ''}`;
        if (playedUci.slice(0, 4) === nextGameMove.uci.slice(0, 4)) {
          onSelectPly(currentPly + 1);
          setSelectedSquare(null);
          setLegalTargetSquares([]);
          return true;
        }
      }

      // 2. Otherwise: Enter or advance the Custom Variation
      const newVarMove: VariationMove = {
        san: moveResult.san,
        uci: `${moveResult.from}${moveResult.to}${moveResult.promotion || ''}`,
        from: moveResult.from,
        to: moveResult.to,
        fenBefore: currentBoardFen,
        fenAfter: chessInstance.fen(),
      };

      if (!isVariationActive) {
        setIsVariationActive(true);
        setVariationRootPly(currentPly);
        setVariationMoves([newVarMove]);
        setVariationIndex(1);
      } else {
        const branch = variationMoves.slice(0, variationIndex);
        branch.push(newVarMove);
        setVariationMoves(branch);
        setVariationIndex(branch.length);
      }

      setSelectedSquare(null);
      setLegalTargetSquares([]);
      return true;
    },
    [displayedFen, isVariationActive, currentPly, totalPlies, moves, onSelectPly, variationIndex, variationMoves]
  );

  // react-chessboard drag & drop callback
  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!targetSquare || sourceSquare === targetSquare) return false;
      return handleMakeMove(sourceSquare, targetSquare, 'q');
    },
    [handleMakeMove]
  );

  // Square click for click-to-move
  const handleSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      let chessInstance: Chess;
      try {
        chessInstance = new Chess(displayedFen);
      } catch {
        return;
      }

      // If a square is already selected, try to move to the clicked square
      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
          setLegalTargetSquares([]);
          return;
        }

        const moved = handleMakeMove(selectedSquare, square, 'q');
        if (moved) return;
      }

      // If clicking own side's piece, select it and show legal destination dots
      const piece = chessInstance.get(square as any);
      if (piece && piece.color === chessInstance.turn()) {
        setSelectedSquare(square);
        const legalMoves = chessInstance.moves({ square: square as any, verbose: true });
        setLegalTargetSquares(legalMoves.map((m) => m.to));
      } else {
        setSelectedSquare(null);
        setLegalTargetSquares([]);
      }
    },
    [displayedFen, selectedSquare, handleMakeMove]
  );

  // Play engine candidate move into the variation
  const handlePlayEngineMove = useCallback(
    (uciMove: string) => {
      if (!uciMove || uciMove.length < 4) return;
      const from = uciMove.slice(0, 2);
      const to = uciMove.slice(2, 4);
      const promotion = uciMove[4] || 'q';
      handleMakeMove(from, to, promotion);
    },
    [handleMakeMove]
  );

  // Exit variation mode and return cleanly to main game review
  const handleExitVariation = useCallback(() => {
    setIsVariationActive(false);
    setVariationMoves([]);
    setVariationIndex(0);
    setLiveEval(null);
    setSelectedSquare(null);
    setLegalTargetSquares([]);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select, button, a, [contenteditable="true"]')) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        if (isVariationActive) {
          if (variationIndex > 0) {
            setVariationIndex((prev) => prev - 1);
          } else {
            handleExitVariation();
          }
        } else if (currentPly > 0) {
          onSelectPly(currentPly - 1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        if (isVariationActive) {
          if (variationIndex < variationMoves.length) {
            setVariationIndex((prev) => prev + 1);
          }
        } else if (currentPly < totalPlies) {
          onSelectPly(currentPly + 1);
        }
      } else if (e.key === ' ' && !isVariationActive) {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'Escape' && isVariationActive) {
        e.preventDefault();
        handleExitVariation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVariationActive, variationIndex, variationMoves.length, currentPly, totalPlies, onSelectPly, handleExitVariation]);

  // Board arrows computation
  const customArrows: Arrow[] = useMemo(() => {
    const arrows: Arrow[] = [];

    // In Variation Mode:
    if (isVariationActive) {
      // 1. Played variation move arrow (Sky Blue)
      if (variationIndex > 0 && variationMoves[variationIndex - 1]) {
        const lastVar = variationMoves[variationIndex - 1];
        arrows.push({
          startSquare: lastVar.from,
          endSquare: lastVar.to,
          color: 'rgba(56, 189, 248, 0.85)',
        });
      }

      // 2. Engine Best move arrow for current variation position (Emerald Green)
      if (liveEval?.bestMove && liveEval.bestMove.length >= 4) {
        arrows.push({
          startSquare: liveEval.bestMove.slice(0, 2),
          endSquare: liveEval.bestMove.slice(2, 4),
          color: 'rgba(16, 185, 129, 0.92)',
        });
      }

      return arrows;
    }

    // In Main Game Review Mode:
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

    // 1. Played move arrow
    if (currentMove.from && currentMove.to && !isBestPlayed) {
      const meta = CLASSIFICATION_META[currentMove.classification];
      arrows.push({
        startSquare: currentMove.from,
        endSquare: currentMove.to,
        color: meta.color + 'cc',
      });
    }

    // 2. Engine Best Move arrow
    if (bestUci && bestUci.length >= 4) {
      arrows.push({
        startSquare: bestUci.slice(0, 2),
        endSquare: bestUci.slice(2, 4),
        color: 'rgba(16, 185, 129, 0.92)',
      });
    }

    return arrows;
  }, [isVariationActive, variationIndex, variationMoves, liveEval?.bestMove, currentMove, nextMove]);

  // Selected piece & legal move dot styling
  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(234, 179, 8, 0.35)',
      };
    }
    for (const sq of legalTargetSquares) {
      styles[sq] = {
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.5) 24%, transparent 26%)',
      };
    }
    return styles;
  }, [selectedSquare, legalTargetSquares]);

  // Classification badges on the board
  const squareRenderer = useCallback(
    ({
      square,
      children,
    }: {
      square: string;
      children?: React.ReactNode;
    }) => {
      const isTargetSquare = !isVariationActive && currentMove && currentMove.to === square;

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
    [isVariationActive, currentMove]
  );

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Variation Exploration Banner (when in variation mode) */}
      {isVariationActive && (
        <div className="w-full max-w-[500px] sm:max-w-[540px] mb-2 px-3 py-2 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900/90 border border-emerald-500/30 rounded-xl shadow-lg flex flex-col gap-2 transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold min-w-0">
              <GitBranch className="w-4 h-4 shrink-0 text-emerald-400 animate-pulse" />
              <span className="truncate">{t('exploringVariation')}</span>
              <span className="text-slate-400 font-normal font-mono text-[11px] shrink-0">
                ({t('variationFromMove', { move: variationRootPly > 0 ? moves[variationRootPly - 1].moveNumber : 1 })})
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setVariationIndex(0)}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/[0.08] transition-colors"
                title={t('resetVariation')}
              >
                <RotateCcw className="w-3 h-3 inline mr-1" />
                <span>{t('resetVariation')}</span>
              </button>

              <button
                onClick={handleExitVariation}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t('backToGame')}</span>
              </button>
            </div>
          </div>

          {/* Variation Move Breadcrumb Trail */}
          <div className="flex items-center gap-1 flex-wrap text-xs font-mono overflow-x-auto py-0.5 border-t border-white/[0.06] pt-1.5">
            <button
              onClick={() => setVariationIndex(0)}
              className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                variationIndex === 0
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              [Start]
            </button>
            {variationMoves.map((vm, idx) => {
              const isActive = variationIndex === idx + 1;
              return (
                <button
                  key={`var-${idx}-${vm.san}`}
                  onClick={() => setVariationIndex(idx + 1)}
                  className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                    isActive
                      ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {vm.san}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Board & Eval Bar Row */}
      <div className="flex items-stretch justify-center gap-2.5 w-full">
        {/* Vertical Eval Bar */}
        <EvalBar
          scoreCp={currentEvalCp}
          mate={currentMate}
          orientation={orientation}
        />

        {/* Board Container */}
        <div
          dir="ltr"
          className="relative w-full max-w-[500px] sm:max-w-[540px] aspect-square rounded-xl overflow-hidden shadow-xl border border-white/[0.08] bg-slate-950"
        >
          <Chessboard
            options={{
              position: displayedFen,
              boardOrientation: orientation,
              arrows: customArrows,
              squareRenderer,
              allowDragging: true,
              onPieceDrop: handlePieceDrop,
              onSquareClick: handleSquareClick,
              squareStyles,
              boardStyle: {
                borderRadius: '12px',
              },
              darkSquareStyle: { backgroundColor: '#739552' },
              lightSquareStyle: { backgroundColor: '#ebecd0' },
            }}
          />
        </div>
      </div>

      {/* Engine Best Move Status Strip */}
      <div className="w-full max-w-[500px] sm:max-w-[540px] mt-2 px-3 py-1.5 bg-slate-900/90 border border-white/[0.08] rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-mono shadow-sm">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-slate-400 font-sans font-medium flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isEvaluatingLive ? 'bg-amber-400 animate-spin' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            {t('engineBestLabel')}
          </span>

          {isVariationActive ? (
            /* Variation Engine Move & Play Button */
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30 tracking-wide">
                {variationBestSan || liveEval?.bestMove || (isEvaluatingLive ? t('engineCalculating') : '...')}
              </span>

              {liveEval?.bestMove && (
                <button
                  onClick={() => handlePlayEngineMove(liveEval.bestMove)}
                  title={t('playBestMove')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow transition-colors"
                >
                  <PlayCircle className="w-3 h-3" />
                  <span>{t('playBestMove')}</span>
                </button>
              )}
            </div>
          ) : (
            /* Main Game Engine Move */
            <>
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
                    ({t('playedMoveLabel')}{' '}
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
            </>
          )}
        </div>

        {/* Eval Score Display */}
        <div className="text-slate-400 text-[11px] shrink-0 font-mono">
          {t('evalLabel')}{' '}
          <span className="font-semibold text-slate-200">
            {currentMate !== undefined
              ? currentMate > 0
                ? `M${currentMate}`
                : `-M${Math.abs(currentMate)}`
              : currentEvalCp > 0
                ? `+${(currentEvalCp / 100).toFixed(1)}`
                : (currentEvalCp / 100).toFixed(1)}
          </span>
        </div>
      </div>

      {/* MultiPV candidate moves chips (when in variation with alternative lines) */}
      {isVariationActive && liveEval?.multiPVEvals && liveEval.multiPVEvals.length > 1 && (
        <div className="w-full max-w-[500px] sm:max-w-[540px] mt-1.5 px-3 py-1 bg-slate-950/60 border border-white/[0.06] rounded-lg flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
          <span className="text-slate-500 font-sans text-[10px] shrink-0">{t('candidateLines')}:</span>
          {liveEval.multiPVEvals.map((line, idx) => {
            const scoreText = line.mate !== undefined
              ? (line.mate > 0 ? `M${line.mate}` : `-M${Math.abs(line.mate)}`)
              : line.scoreCp !== undefined
                ? (line.scoreCp > 0 ? `+${(line.scoreCp / 100).toFixed(1)}` : (line.scoreCp / 100).toFixed(1))
                : '';
            return (
              <button
                key={`candidate-${line.pvIndex}-${line.bestMove}`}
                onClick={() => handlePlayEngineMove(line.bestMove)}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/[0.08] transition-colors shrink-0 flex items-center gap-1"
              >
                <span className="text-slate-500 font-bold">{idx + 1}.</span>
                <span className="text-emerald-400 font-semibold">{line.bestMove}</span>
                {scoreText && <span className="text-slate-500 text-[10px]">({scoreText})</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Board Navigation Controls Bar */}
      <div className="w-full max-w-[500px] sm:max-w-[540px] mt-2.5 bg-slate-900/80 border border-white/[0.08] rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5">
          {/* Left: Orientation Flip */}
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
            {/* First */}
            <button
              onClick={() => {
                setIsPlaying(false);
                if (isVariationActive) {
                  setVariationIndex(0);
                } else {
                  onSelectPly(0);
                }
              }}
              disabled={isVariationActive ? variationIndex === 0 : currentPly === 0}
              title={t('firstMove')}
              aria-label={t('firstMove')}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Previous */}
            <button
              onClick={() => {
                setIsPlaying(false);
                if (isVariationActive) {
                  if (variationIndex > 0) {
                    setVariationIndex((prev) => prev - 1);
                  } else {
                    handleExitVariation();
                  }
                } else if (currentPly > 0) {
                  onSelectPly(currentPly - 1);
                }
              }}
              disabled={!isVariationActive && currentPly === 0}
              title={t('prevMove')}
              aria-label={t('prevMove')}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Auto-Play Toggle (disabled in variation mode) */}
            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              disabled={isVariationActive}
              title={isPlaying ? t('pause') : t('autoPlay')}
              aria-label={isPlaying ? t('pause') : t('autoPlay')}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.06] transition-colors mx-1 disabled:opacity-25"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {/* Next */}
            <button
              onClick={() => {
                setIsPlaying(false);
                if (isVariationActive) {
                  if (variationIndex < variationMoves.length) {
                    setVariationIndex((prev) => prev + 1);
                  }
                } else if (currentPly < totalPlies) {
                  onSelectPly(currentPly + 1);
                }
              }}
              disabled={isVariationActive ? variationIndex === variationMoves.length : currentPly === totalPlies}
              title={t('nextMove')}
              aria-label={t('nextMove')}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last */}
            <button
              onClick={() => {
                setIsPlaying(false);
                if (isVariationActive) {
                  setVariationIndex(variationMoves.length);
                } else {
                  onSelectPly(totalPlies);
                }
              }}
              disabled={isVariationActive ? variationIndex === variationMoves.length : currentPly === totalPlies}
              title={t('lastMove')}
              aria-label={t('lastMove')}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Step Counter */}
          <div className="text-[11px] font-mono text-slate-400 px-1" dir="ltr">
            {isVariationActive ? (
              <span className="text-emerald-400 font-semibold">
                Var: {variationIndex}/{variationMoves.length}
              </span>
            ) : (
              <span>
                {currentPly}/{totalPlies}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
