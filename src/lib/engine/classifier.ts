import { Chess, Square } from 'chess.js';
import {
  ClassificationMeta,
  MoveAnalysis,
  MoveClassification,
  EngineEvalResult,
} from '@/types/chess';
import { lookupOpening } from '@/lib/openings';

export const CLASSIFICATION_META: Record<MoveClassification, ClassificationMeta> = {
  brilliant: {
    type: 'brilliant',
    symbol: '!!',
    name: 'Brilliant',
    color: '#14b8a6',
    bgColor: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    description: 'A brilliant move sacrificing material for decisive tactical compensation.',
  },
  great: {
    type: 'great',
    symbol: '!',
    name: 'Great',
    color: '#3b82f6',
    bgColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    description: 'The only move that maintains the advantage or escapes trouble.',
  },
  best: {
    type: 'best',
    symbol: 'Best',
    name: 'Best',
    color: '#10b981',
    bgColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    description: 'The engine top recommendation.',
  },
  excellent: {
    type: 'excellent',
    symbol: 'Ex',
    name: 'Excellent',
    color: '#22c55e',
    bgColor: 'bg-green-500/15 text-green-400 border-green-500/30',
    description: 'An excellent move that preserves the advantage.',
  },
  good: {
    type: 'good',
    symbol: 'Gd',
    name: 'Good',
    color: '#4ade80',
    bgColor: 'bg-green-500/10 text-green-400 border-green-500/20',
    description: 'A solid, natural move.',
  },
  book: {
    type: 'book',
    symbol: 'Book',
    name: 'Book',
    color: '#94a3b8',
    bgColor: 'bg-slate-700/30 text-slate-300 border-slate-700',
    description: 'Standard opening theory.',
  },
  inaccuracy: {
    type: 'inaccuracy',
    symbol: '?!',
    name: 'Inaccuracy',
    color: '#eab308',
    bgColor: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    description: 'An inaccuracy that surrenders some of your advantage.',
  },
  mistake: {
    type: 'mistake',
    symbol: '?',
    name: 'Mistake',
    color: '#f97316',
    bgColor: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    description: 'A mistake that worsens your position.',
  },
  blunder: {
    type: 'blunder',
    symbol: '??',
    name: 'Blunder',
    color: '#ef4444',
    bgColor: 'bg-red-500/15 text-red-400 border-red-500/30',
    description: 'A critical blunder that drastically shifts evaluation.',
  },
  missed_win: {
    type: 'missed_win',
    symbol: 'Miss',
    name: 'Missed Win',
    color: '#ec4899',
    bgColor: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    description: 'Missed a decisive tactical win or advantage.',
  },
};

/**
 * Standard Lichess / Chess.com sigmoid formula converting centipawns to Win Percentage (0-100%)
 */
export function cpToWinPct(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/**
 * Calculates CAPS-style move accuracy (0-100%) from win% loss
 */
export function calculateMoveAccuracy(winPctLoss: number): number {
  if (winPctLoss <= 0) return 100;
  const raw = 103.1668 * Math.exp(-0.04354 * winPctLoss) - 3.1669;
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
}

/**
 * Calculates player overall accuracy as average of move accuracies
 */
export function calculatePlayerAccuracy(moves: MoveAnalysis[], color: 'w' | 'b'): number {
  const playerMoves = moves.filter((m) => m.turn === color);
  if (playerMoves.length === 0) return 100;

  const total = playerMoves.reduce((acc, m) => {
    return acc + calculateMoveAccuracy(m.winPctLoss);
  }, 0);

  return Math.round((total / playerMoves.length) * 10) / 10;
}

/**
 * Estimates Elo performance from overall accuracy
 */
export function estimateEloFromAccuracy(accuracy: number): number {
  if (accuracy >= 98) return 2850;
  if (accuracy <= 40) return 400;
  const est = Math.round(350 + 26.5 * accuracy);
  return Math.min(3000, Math.max(400, est));
}

/**
 * Checks if a move was a genuine material sacrifice (for Brilliant move detection)
 */
export function isMaterialSacrifice(
  fenBefore: string,
  fenAfter: string,
  move: { from: string; to: string; san?: string },
  turn: 'w' | 'b'
): boolean {
  try {
    const chessBefore = new Chess(fenBefore);
    const chessAfter = new Chess(fenAfter);

    // Moves escaping check cannot be considered voluntary sacrifices
    if (chessBefore.inCheck()) return false;

    // Checkmates are terminal victories, not sacrifices
    if (chessAfter.isCheckmate()) return false;

    // Pawn promotions are material gains, not sacrifices
    if (move.san && move.san.includes('=')) return false;

    const oppColor = turn === 'w' ? 'b' : 'w';
    const pieceValues: Record<string, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
    };

    const fromSquare = move.from as Square;
    const toSquare = move.to as Square;

    const pieceMoved = chessBefore.get(fromSquare);
    if (!pieceMoved || pieceMoved.type === 'k') return false;

    const movedVal = pieceValues[pieceMoved.type] || 0;
    const capturedPiece = chessBefore.get(toSquare);
    const capturedVal = capturedPiece ? (pieceValues[capturedPiece.type] || 0) : 0;

    // 1. Direct Piece or Exchange Sacrifice
    // The piece moved to a square directly attacked by opponent
    const oppMoves = chessAfter.moves({ verbose: true });
    const directCaptures = oppMoves.filter((m) => m.to === toSquare);

    if (directCaptures.length > 0) {
      const minAttackerVal = Math.min(
        ...directCaptures.map((m) => pieceValues[m.piece] || 1)
      );

      // A: Attacked by a lower-value piece (e.g. minor piece attacked by pawn, rook by minor/pawn, queen by rook/minor/pawn)
      if (movedVal >= 3 && minAttackerVal < movedVal && capturedVal < movedVal) {
        return true;
      }

      // B: Major or minor piece left hanging / undefended
      const isDefended = chessAfter.isAttacked(toSquare, turn);
      if (movedVal >= 3 && !isDefended && capturedVal < movedVal) {
        return true;
      }

      // C: Exchange sacrifice (giving up Rook for minor piece, net >= 2 pawn deficit)
      if (movedVal === 5 && capturedVal <= 3 && minAttackerVal <= 3) {
        return true;
      }
    }

    // 2. Discovered / Quiet sacrifice: leaving another major/minor piece hanging
    const board = chessAfter.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (
          p &&
          p.color === turn &&
          (p.type === 'n' || p.type === 'b' || p.type === 'r' || p.type === 'q')
        ) {
          const sq = p.square;
          if (sq !== toSquare) {
            const val = pieceValues[p.type] || 0;
            const attackedBefore = chessBefore.isAttacked(sq, oppColor);
            const attackedAfter = chessAfter.isAttacked(sq, oppColor);
            const defendedAfter = chessAfter.isAttacked(sq, turn);

            if (!attackedBefore && attackedAfter && !defendedAfter && val >= 3) {
              const oppCanCapture = oppMoves.some((m) => m.to === sq);
              if (oppCanCapture) {
                return true;
              }
            }
          }
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Classifies a single chess move
 */
export function classifyMove({
  ply,
  moveNumber,
  turn,
  san,
  uci,
  from,
  to,
  fenBefore,
  fenAfter,
  evalBeforeObj,
  evalAfterObj,
  prevMoveAnalysis,
  forceBook = false,
}: {
  ply: number;
  moveNumber: number;
  turn: 'w' | 'b';
  san: string;
  uci: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  evalBeforeObj: EngineEvalResult;
  evalAfterObj: EngineEvalResult;
  prevMoveAnalysis?: MoveAnalysis;
  forceBook?: boolean;
}): {
  classification: MoveClassification;
  winPctBefore: number;
  winPctAfter: number;
  winPctLoss: number;
  evalBeforeWhite: number;
  evalAfterWhite: number;
  pieceSacrificed: boolean;
} {
  // Both evalBeforeObj and evalAfterObj are normalized to White's perspective
  const evalBeforeWhite = evalBeforeObj.scoreCp ?? 0;
  const evalAfterWhite = evalAfterObj.scoreCp ?? 0;

  // Convert evaluations to moving player's perspective
  const playerEvalBefore = turn === 'w' ? evalBeforeWhite : -evalBeforeWhite;
  const playerEvalAfter = turn === 'w' ? evalAfterWhite : -evalAfterWhite;

  const winPctBefore = cpToWinPct(playerEvalBefore);
  const winPctAfter = cpToWinPct(playerEvalAfter);
  const rawWinPctLoss = Math.max(0, winPctBefore - winPctAfter);

  const bestMove = evalBeforeObj.bestMove || '';
  const isTopEngineChoice = bestMove === uci;

  const openingMatch = lookupOpening(fenAfter);
  const isBookMove = Boolean(forceBook || (ply <= 16 && openingMatch));

  const isSacrifice = isMaterialSacrifice(fenBefore, fenAfter, { from, to, san }, turn);

  // MultiPV 2 evaluation from moving player's perspective
  const pv2White = evalBeforeObj.multiPVEvals?.[1]?.scoreCp;
  const playerPv2 = pv2White !== undefined ? (turn === 'w' ? pv2White : -pv2White) : undefined;
  const pv2WinPct = playerPv2 !== undefined ? cpToWinPct(playerPv2) : undefined;
  const pv2WinPctLoss = pv2WinPct !== undefined ? Math.max(0, winPctBefore - pv2WinPct) : 0;

  let classification: MoveClassification = 'good';

  // 1. Theoretical opening move (unconditionally classified as Book regardless of shallow engine WPL)
  if (isBookMove) {
    classification = 'book';
  }
  // 2. Brilliant move: sound sacrifice that maintains advantage without already being overwhelmingly won
  else if (
    isSacrifice &&
    (isTopEngineChoice || rawWinPctLoss <= 1.5) &&
    playerEvalAfter >= -50 &&
    playerEvalBefore < 700
  ) {
    classification = 'brilliant';
  }
  // 3. Great move: only move that saves the position or maintains winning advantage (gap to 2nd PV is substantial)
  else if (
    isTopEngineChoice &&
    pv2WinPctLoss >= 8.5 &&
    playerEvalAfter >= -150 &&
    playerEvalBefore <= 600
  ) {
    classification = 'great';
  }
  // 4. Missed Win / Miss: failing to punish an opponent's blunder or giving back a decisive win
  else if (
    (prevMoveAnalysis &&
      prevMoveAnalysis.classification !== 'book' &&
      prevMoveAnalysis.winPctLoss >= 10 &&
      rawWinPctLoss >= prevMoveAnalysis.winPctLoss * 0.6 &&
      rawWinPctLoss >= 8) ||
    (playerEvalBefore >= 300 && playerEvalAfter < 100 && rawWinPctLoss >= 15)
  ) {
    classification = 'missed_win';
  }
  // 5. Standard Expected Points Loss thresholds (Chess.com / Lichess standard)
  else if (rawWinPctLoss >= 20) {
    classification = 'blunder';
  } else if (rawWinPctLoss >= 10) {
    classification = 'mistake';
  } else if (rawWinPctLoss >= 5) {
    classification = 'inaccuracy';
  } else if (isTopEngineChoice || rawWinPctLoss <= 1.5) {
    classification = 'best';
  } else if (rawWinPctLoss <= 3.5) {
    classification = 'excellent';
  } else {
    classification = 'good';
  }

  const winPctLoss = classification === 'book' ? 0 : rawWinPctLoss;

  return {
    classification,
    winPctBefore,
    winPctAfter,
    winPctLoss,
    evalBeforeWhite,
    evalAfterWhite,
    pieceSacrificed: isSacrifice,
  };
}
