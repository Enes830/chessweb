'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { MoveAnalysis } from '@/types/chess';
import { CLASSIFICATION_META } from '@/lib/engine/classifier';
import { EvalBar } from '@/components/EvalBar';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { getStockfishClient } from '@/lib/engine/workerClient';
import {
  RotateCcw,
  SkipBack,
  ChevronLeft,
  Play,
  Pause,
  ChevronRight,
  SkipForward,
  GitBranch,
  Undo2,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

interface Arrow {
  startSquare: string;
  endSquare: string;
  color: string;
}

interface VariationMove {
  san: string;
  uci: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  turn: 'w' | 'b';
}

interface LegalMoveTarget {
  to: string;
  isCapture: boolean;
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

  // Custom Variation state
  const [variationMoves, setVariationMoves] = useState<VariationMove[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<LegalMoveTarget[]>([]);
  const [variationEval, setVariationEval] = useState<{
    scoreCp: number;
    mate?: number;
    bestMoveUci?: string;
    bestMoveSan?: string;
    isEvaluating?: boolean;
  } | null>(null);

  const totalPlies = moves.length;
  const currentMove = currentPly > 0 ? moves[currentPly - 1] : null;
  const nextMove = currentPly < totalPlies ? moves[currentPly] : null;

  // Base game FEN for current ply
  const baseFen = useMemo(() => {
    if (!currentMove) {
      return moves.length > 0
        ? moves[0].fenBefore
        : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    return currentMove.fenAfter;
  }, [currentMove, moves]);

  // Current active FEN: either from custom variation branch or game review
  const isCustomVariation = variationMoves.length > 0;
  const displayFen = useMemo(() => {
    if (isCustomVariation) {
      return variationMoves[variationMoves.length - 1].fenAfter;
    }
    return baseFen;
  }, [isCustomVariation, variationMoves, baseFen]);

  // Chess.js instance for current position
  const currentChess = useMemo(() => {
    try {
      return new Chess(displayFen);
    } catch {
      return new Chess();
    }
  }, [displayFen]);

  // Reset custom variation whenever currentPly is changed from the outside (move list / controls)
  const prevPlyRef = useRef(currentPly);
  useEffect(() => {
    if (prevPlyRef.current !== currentPly) {
      prevPlyRef.current = currentPly;
      setVariationMoves([]);
      setSelectedSquare(null);
      setLegalMoves([]);
      setVariationEval(null);
    }
  }, [currentPly]);

  // Real-time Stockfish evaluation for custom variation moves
  useEffect(() => {
    if (!isCustomVariation) {
      setVariationEval(null);
      return;
    }

    let isCurrent = true;
    const currentVarFen = variationMoves[variationMoves.length - 1].fenAfter;

    setVariationEval((prev) => ({
      scoreCp: prev?.scoreCp ?? 0,
      mate: prev?.mate,
      bestMoveUci: '',
      bestMoveSan: '',
      isEvaluating: true,
    }));

    try {
      const client = getStockfishClient();
      client
        .evaluatePosition(currentVarFen, 12, 1)
        .then((result) => {
          if (!isCurrent) return;

          let bestSan = '';
          try {
            const probe = new Chess(currentVarFen);
            if (result.bestMove && result.bestMove.length >= 4) {
              const m = probe.move({
                from: result.bestMove.slice(0, 2),
                to: result.bestMove.slice(2, 4),
                promotion: result.bestMove[4] || undefined,
              });
              if (m) bestSan = m.san;
            }
          } catch {
            // ignore
          }

          setVariationEval({
            scoreCp: result.scoreCp ?? 0,
            mate: result.mate,
            bestMoveUci: result.bestMove,
            bestMoveSan: bestSan || result.bestMove,
            isEvaluating: false,
          });
        })
        .catch(() => {
          if (isCurrent) {
            setVariationEval((prev) => (prev ? { ...prev, isEvaluating: false } : null));
          }
        });
    } catch {
      if (isCurrent) {
        setVariationEval((prev) => (prev ? { ...prev, isEvaluating: false } : null));
      }
    }

    return () => {
      isCurrent = false;
    };
  }, [isCustomVariation, variationMoves]);

  // Current evaluation for EvalBar
  const currentEvalCp = useMemo(() => {
    if (isCustomVariation && variationEval) {
      return variationEval.scoreCp;
    }
    return currentMove ? currentMove.evalAfter : moves.length > 0 ? moves[0].evalBefore : 0;
  }, [isCustomVariation, variationEval, currentMove, moves]);

  const currentMate = useMemo(() => {
    if (isCustomVariation && variationEval) {
      return variationEval.mate;
    }
    return currentMove
      ? currentMove.isMateAfter
        ? currentMove.mateAfter
        : undefined
      : moves.length > 0 && moves[0].isMateBefore
      ? moves[0].mateBefore
      : undefined;
  }, [isCustomVariation, variationEval, currentMove, moves]);

  // Auto-play interval (only active when not in variation)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && !isCustomVariation) {
      timer = setInterval(() => {
        onSelectPly(currentPly < totalPlies ? currentPly + 1 : 0);
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isPlaying, isCustomVariation, currentPly, totalPlies, onSelectPly]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest(
          'input, textarea, select, button, a, [contenteditable="true"]'
        )
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        if (variationMoves.length > 0) {
          // Step back in variation
          handleUndoVariationMove();
        } else if (currentPly > 0) {
          onSelectPly(currentPly - 1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        if (variationMoves.length === 0 && currentPly < totalPlies) {
          onSelectPly(currentPly + 1);
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        if (!isCustomVariation) {
          setIsPlaying((prev) => !prev);
        }
      } else if (e.key === 'Escape') {
        // Deselect or exit variation
        if (selectedSquare) {
          setSelectedSquare(null);
          setLegalMoves([]);
        } else if (isCustomVariation) {
          handleExitVariation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPly, totalPlies, onSelectPly, variationMoves, isCustomVariation, selectedSquare]);

  // Calculate legal moves for a given square
  const getLegalMovesForSquare = useCallback(
    (sq: string): LegalMoveTarget[] => {
      try {
        const movesList = currentChess.moves({ square: sq as Square, verbose: true });
        return movesList.map((m) => ({
          to: m.to,
          isCapture: Boolean(m.captured) || m.flags.includes('e') || m.flags.includes('c'),
        }));
      } catch {
        return [];
      }
    },
    [currentChess]
  );

  // Apply a played variation move
  const handleExecuteVariationMove = useCallback((newMove: VariationMove) => {
    setIsPlaying(false);
    setSelectedSquare(null);
    setLegalMoves([]);
    setVariationMoves((prev) => [...prev, newMove]);
  }, []);

  const handleExitVariation = useCallback(() => {
    setVariationMoves([]);
    setSelectedSquare(null);
    setLegalMoves([]);
    setVariationEval(null);
  }, []);

  const handleUndoVariationMove = useCallback(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
    setVariationMoves((prev) => prev.slice(0, -1));
  }, []);

  // Handle clicking on a square or piece
  const lastClickRef = useRef<{ time: number; square: string }>({ time: 0, square: '' });

  const handleSquareAction = useCallback(
    (square: string) => {
      // 1. If a piece is already selected, and user clicks on a legal target square -> play the move!
      if (selectedSquare && legalMoves.some((m) => m.to === square)) {
        try {
          const testChess = new Chess(displayFen);
          const moveResult = testChess.move({
            from: selectedSquare,
            to: square,
            promotion: 'q',
          });

          if (moveResult) {
            handleExecuteVariationMove({
              san: moveResult.san,
              uci: `${moveResult.from}${moveResult.to}${moveResult.promotion || ''}`,
              from: moveResult.from,
              to: moveResult.to,
              fenBefore: moveResult.before,
              fenAfter: moveResult.after,
              turn: moveResult.color,
            });
            return;
          }
        } catch {
          // move failed
        }
      }

      // 2. If user clicked the same square again -> deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // 3. If user clicked a piece belonging to the side to move -> select it & show legal moves!
      const piece = currentChess.get(square as Square);
      if (piece && piece.color === currentChess.turn()) {
        setSelectedSquare(square);
        const targets = getLegalMovesForSquare(square);
        setLegalMoves(targets);
        return;
      }

      // 4. Any other click (empty non-legal square, or enemy piece not under capture) -> deselect
      setSelectedSquare(null);
      setLegalMoves([]);
    },
    [selectedSquare, legalMoves, displayFen, currentChess, getLegalMovesForSquare, handleExecuteVariationMove]
  );

  // Debounce click handlers to ensure piece click and square click don't fire twice
  const handleSquareClick = useCallback(
    ({ square }: { square: string }) => {
      const now = Date.now();
      if (now - lastClickRef.current.time < 50 && lastClickRef.current.square === square) {
        return;
      }
      lastClickRef.current = { time: now, square };
      handleSquareAction(square);
    },
    [handleSquareAction]
  );

  const handlePieceClick = useCallback(
    ({ square }: { square: string | null }) => {
      if (!square) return;
      const now = Date.now();
      if (now - lastClickRef.current.time < 50 && lastClickRef.current.square === square) {
        return;
      }
      lastClickRef.current = { time: now, square };
      handleSquareAction(square);
    },
    [handleSquareAction]
  );

  // Drag and drop handlers
  const handleCanDragPiece = useCallback(
    ({ piece }: { piece: { pieceType: string } }): boolean => {
      const turn = currentChess.turn();
      return piece.pieceType.startsWith(turn);
    },
    [currentChess]
  );

  const handlePieceDrag = useCallback(
    ({ square }: { square: string | null }) => {
      if (square) {
        const piece = currentChess.get(square as Square);
        if (piece && piece.color === currentChess.turn()) {
          setSelectedSquare(square);
          const targets = getLegalMovesForSquare(square);
          setLegalMoves(targets);
        }
      }
    },
    [currentChess, getLegalMovesForSquare]
  );

  const handlePieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }): boolean => {
      if (!targetSquare) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return false;
      }

      try {
        const testChess = new Chess(displayFen);
        const moveResult = testChess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        });

        if (moveResult) {
          handleExecuteVariationMove({
            san: moveResult.san,
            uci: `${moveResult.from}${moveResult.to}${moveResult.promotion || ''}`,
            from: moveResult.from,
            to: moveResult.to,
            fenBefore: moveResult.before,
            fenAfter: moveResult.after,
            turn: moveResult.color,
          });
          return true;
        }
      } catch {
        // illegal move
      }

      setSelectedSquare(null);
      setLegalMoves([]);
      return false;
    },
    [displayFen, handleExecuteVariationMove]
  );

  // Map of legal destination squares
  const legalMovesMap = useMemo(() => {
    const map = new Map<string, boolean>();
    legalMoves.forEach((m) => {
      map.set(m.to, m.isCapture);
    });
    return map;
  }, [legalMoves]);

  // Last move played (in game or in variation)
  const lastPlayedMove = useMemo(() => {
    if (isCustomVariation) {
      return variationMoves[variationMoves.length - 1];
    }
    return currentMove;
  }, [isCustomVariation, variationMoves, currentMove]);

  // Variation move sequence formatted as chess notation
  const variationMovesText = useMemo(() => {
    if (variationMoves.length === 0) return '';
    const startFen = variationMoves[0].fenBefore;
    const parts = startFen.split(' ');
    let fullMoveNum = parseInt(parts[5], 10) || 1;

    const tokens: string[] = [];
    variationMoves.forEach((vm, idx) => {
      if (idx === 0) {
        if (vm.turn === 'w') {
          tokens.push(`${fullMoveNum}. ${vm.san}`);
        } else {
          tokens.push(`${fullMoveNum}... ${vm.san}`);
          fullMoveNum++;
        }
      } else {
        if (vm.turn === 'w') {
          tokens.push(`${fullMoveNum}. ${vm.san}`);
        } else {
          tokens.push(`${vm.san}`);
          fullMoveNum++;
        }
      }
    });

    return tokens.join(' ');
  }, [variationMoves]);

  // Arrows logic
  const customArrows: Arrow[] = useMemo(() => {
    const arrows: Arrow[] = [];

    // Helper to prevent duplicate arrows that would produce duplicate React keys
    const dedupeArrows = (arr: Arrow[]): Arrow[] => {
      const seen = new Set<string>();
      const result: Arrow[] = [];
      for (const a of arr) {
        const key = `${a.startSquare}-${a.endSquare}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(a);
        }
      }
      return result;
    };

    // In custom variation: show last played move + engine best reply
    if (isCustomVariation) {
      const lastVarMove = variationMoves[variationMoves.length - 1];
      if (lastVarMove?.from && lastVarMove?.to) {
        arrows.push({
          startSquare: lastVarMove.from,
          endSquare: lastVarMove.to,
          color: 'rgba(56, 189, 248, 0.75)', // Sky blue for user's variation move
        });
      }
      // Only display engine reply once evaluation for current position is ready
      if (
        !variationEval?.isEvaluating &&
        variationEval?.bestMoveUci &&
        variationEval.bestMoveUci.length >= 4
      ) {
        const startSq = variationEval.bestMoveUci.slice(0, 2);
        const endSq = variationEval.bestMoveUci.slice(2, 4);
        if (startSq !== lastVarMove?.from || endSq !== lastVarMove?.to) {
          arrows.push({
            startSquare: startSq,
            endSquare: endSq,
            color: 'rgba(16, 185, 129, 0.92)', // Emerald green for engine response
          });
        }
      }
      return dedupeArrows(arrows);
    }

    // At starting position (ply 0), show the engine's best opening move arrow
    if (!currentMove) {
      if (nextMove?.bestMoveUci && nextMove.bestMoveUci.length >= 4) {
        arrows.push({
          startSquare: nextMove.bestMoveUci.slice(0, 2),
          endSquare: nextMove.bestMoveUci.slice(2, 4),
          color: 'rgba(16, 185, 129, 0.92)',
        });
      }
      return dedupeArrows(arrows);
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

    return dedupeArrows(arrows);
  }, [isCustomVariation, variationMoves, variationEval, currentMove, nextMove]);

  // Chessboard Square Renderer: handles legal move dots, capture rings, square selection, and badges
  const squareRenderer = useCallback(
    ({
      square,
      children,
    }: {
      square: string;
      children?: React.ReactNode;
    }) => {
      const isSelected = selectedSquare === square;
      const isLegal = legalMovesMap.has(square);
      const isCapture = legalMovesMap.get(square) === true;
      const isTargetSquare = currentMove && currentMove.to === square && !isCustomVariation;
      const isLastMoveSquare =
        lastPlayedMove && (lastPlayedMove.from === square || lastPlayedMove.to === square);

      return (
        <div className="relative w-full h-full cursor-pointer">
          {/* 1. Last move soft highlight */}
          {isLastMoveSquare && !isSelected && (
            <div className="absolute inset-0 bg-yellow-400/20 dark:bg-yellow-500/25 pointer-events-none z-[1]" />
          )}

          {/* 2. Selected square highlight (Chess.com style yellow-green) */}
          {isSelected && (
            <div className="absolute inset-0 bg-[#baca44]/55 pointer-events-none z-[2]" />
          )}

          {/* 3. Chess piece SVG */}
          {children}

          {/* 4. Chess.com style legal move: empty square centered dot */}
          {isLegal && !isCapture && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="w-[30%] h-[30%] max-w-[26px] max-h-[26px] rounded-full bg-slate-900/35 dark:bg-black/40 shadow-sm" />
            </div>
          )}

          {/* 5. Chess.com style legal move: capture target ring */}
          {isLegal && isCapture && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 p-[2px] sm:p-[3.5px]">
              <div className="w-full h-full rounded-full border-[5px] sm:border-[6px] border-slate-900/35 dark:border-black/40" />
            </div>
          )}

          {/* 6. Game review classification badge (only on actual game moves) */}
          {isTargetSquare && currentMove && (
            <div className="absolute top-1 right-1 z-30 pointer-events-none">
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
    [selectedSquare, legalMovesMap, currentMove, isCustomVariation, lastPlayedMove]
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
        <div
          dir="ltr"
          className="relative w-full max-w-[500px] sm:max-w-[540px] aspect-square rounded-xl overflow-hidden shadow-xl border border-white/[0.08] bg-slate-950"
        >
          <Chessboard
            options={{
              position: displayFen,
              boardOrientation: orientation,
              arrows: customArrows,
              squareRenderer,
              allowDragging: true,
              canDragPiece: handleCanDragPiece,
              onPieceDrag: handlePieceDrag,
              onPieceDrop: handlePieceDrop,
              onSquareClick: handleSquareClick,
              onPieceClick: handlePieceClick,
              boardStyle: {
                borderRadius: '12px',
              },
              darkSquareStyle: { backgroundColor: '#739552' },
              lightSquareStyle: { backgroundColor: '#ebecd0' },
            }}
          />
        </div>
      </div>

      {/* Custom Variation Control Bar (Active when exploring variations) */}
      {isCustomVariation ? (
        <div className="w-full max-w-[500px] sm:max-w-[540px] mt-2 px-3 py-2 bg-gradient-to-r from-sky-950/90 via-slate-900/90 to-sky-950/90 border border-sky-500/30 rounded-xl flex items-center justify-between gap-2 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[11px] font-semibold shrink-0">
              <GitBranch className="w-3 h-3 text-sky-400" />
              <span>{t('customVariation')}</span>
            </span>
            <span className="text-xs font-mono text-slate-200 truncate" dir="ltr">
              {variationMovesText}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Undo last variation move */}
            <button
              onClick={handleUndoVariationMove}
              title={t('undoVariationMove')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-white/[0.08] transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('undoVariationMove')}</span>
            </button>

            {/* Exit variation and return to game */}
            <button
              onClick={handleExitVariation}
              title={t('exitVariation')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-sm transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('exitVariation')}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Engine Best Move Status Strip (shown on every review ply) */
        (currentMove || nextMove) && (
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
                    <span className="text-slate-200 font-mono font-semibold">
                      {currentMove.san}
                    </span>
                    )
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
        )
      )}

      {/* Real-time Engine evaluation strip when exploring custom variation */}
      {isCustomVariation && (
        <div className="w-full max-w-[500px] sm:max-w-[540px] mt-1.5 px-3 py-1.5 bg-slate-900/90 border border-sky-500/20 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-mono shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-sans font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              {locale === 'ar' ? 'الرد الأفضل للتفريعة:' : 'Variation Best Reply:'}
            </span>
            {variationEval?.isEvaluating ? (
              <span className="inline-flex items-center gap-1 text-slate-400 font-sans text-[11px]">
                <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                <span>{locale === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}</span>
              </span>
            ) : variationEval?.bestMoveSan || variationEval?.bestMoveUci ? (
              <span className="text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30 tracking-wide">
                {variationEval.bestMoveSan || variationEval.bestMoveUci}
              </span>
            ) : (
              <span className="text-slate-500 text-[11px]">--</span>
            )}
          </div>
          <div className="text-slate-400 text-[11px] shrink-0">
            {locale === 'ar' ? 'تقييم التفريعة:' : 'Variation Eval:'}{' '}
            <span className="font-semibold text-slate-200">
              {variationEval?.mate
                ? variationEval.mate > 0
                  ? `M${variationEval.mate}`
                  : `-M${Math.abs(variationEval.mate)}`
                : variationEval
                ? variationEval.scoreCp > 0
                  ? `+${(variationEval.scoreCp / 100).toFixed(1)}`
                  : (variationEval.scoreCp / 100).toFixed(1)
                : '--'}
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
                if (isCustomVariation) handleExitVariation();
                onSelectPly(0);
              }}
              disabled={currentPly === 0 && !isCustomVariation}
              title={t('firstMove')}
              aria-label={t('firstMove')}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                if (isCustomVariation) {
                  handleUndoVariationMove();
                } else if (currentPly > 0) {
                  onSelectPly(currentPly - 1);
                }
              }}
              disabled={currentPly === 0 && !isCustomVariation}
              title={t('prevMove')}
              aria-label={t('prevMove')}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (isCustomVariation) handleExitVariation();
                setIsPlaying((prev) => !prev);
              }}
              disabled={isCustomVariation}
              title={isPlaying ? t('pause') : t('autoPlay')}
              aria-label={isPlaying ? t('pause') : t('autoPlay')}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 border border-white/[0.06] transition-colors mx-1"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                if (isCustomVariation) handleExitVariation();
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
                if (isCustomVariation) handleExitVariation();
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
