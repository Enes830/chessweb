import { Chess } from 'chess.js';
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
 * Checks if a move was a material sacrifice
 */
export function isMaterialSacrifice(
  fenBefore: string,
  fenAfter: string,
  turn: 'w' | 'b'
): boolean {
  try {
    const pieceValues: Record<string, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
    };

    const countMaterial = (fen: string, color: 'w' | 'b') => {
      const placement = fen.split(' ')[0];
      let val = 0;
      for (const char of placement) {
        if (color === 'w' && char >= 'A' && char <= 'Z') {
          val += pieceValues[char.toLowerCase()] || 0;
        } else if (color === 'b' && char >= 'a' && char <= 'z') {
          val += pieceValues[char] || 0;
        }
      }
      return val;
    };

    const matBefore = countMaterial(fenBefore, turn);
    const matAfter = countMaterial(fenAfter, turn);

    return matBefore - matAfter >= 3;
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
}): {
  classification: MoveClassification;
  winPctBefore: number;
  winPctAfter: number;
  winPctLoss: number;
  evalBeforeWhite: number;
  evalAfterWhite: number;
  pieceSacrificed: boolean;
} {
  const evalBeforeWhite = evalBeforeObj.scoreCp ?? 0;
  const evalAfterWhite = evalAfterObj.scoreCp ?? 0;

  const playerEvalBefore = turn === 'w' ? evalBeforeWhite : -evalBeforeWhite;
  const playerEvalAfter = turn === 'w' ? evalAfterWhite : -evalAfterWhite;

  const winPctBefore = cpToWinPct(playerEvalBefore);
  const winPctAfter = cpToWinPct(playerEvalAfter);
  const winPctLoss = Math.max(0, winPctBefore - winPctAfter);

  const bestMove = evalBeforeObj.bestMove || '';
  const isTopEngineChoice = bestMove === uci;

  const openingMatch = lookupOpening(fenAfter);
  const isBookMove = ply <= 14 && !!openingMatch;

  const isSacrifice = isMaterialSacrifice(fenBefore, fenAfter, turn);
  const pv2ScoreCp = evalBeforeObj.multiPVEvals?.[1]?.scoreCp;

  let classification: MoveClassification = 'good';

  if (isBookMove && winPctLoss < 4) {
    classification = 'book';
  } else if (
    isSacrifice &&
    (isTopEngineChoice || Math.abs(playerEvalBefore - playerEvalAfter) <= 30) &&
    playerEvalAfter >= 120 &&
    (pv2ScoreCp === undefined ||
      Math.abs(evalBeforeWhite - pv2ScoreCp) >= 150)
  ) {
    classification = 'brilliant';
  } else if (
    isTopEngineChoice &&
    pv2ScoreCp !== undefined &&
    Math.abs(evalBeforeWhite - pv2ScoreCp) >= 150 &&
    playerEvalAfter >= 0
  ) {
    classification = 'great';
  } else if (
    prevMoveAnalysis &&
    ['blunder', 'mistake'].includes(prevMoveAnalysis.classification) &&
    winPctLoss >= 15 &&
    playerEvalBefore >= 200 &&
    playerEvalAfter < 80
  ) {
    classification = 'missed_win';
  } else if (winPctLoss >= 20) {
    classification = 'blunder';
  } else if (winPctLoss >= 10) {
    classification = 'mistake';
  } else if (winPctLoss >= 5) {
    classification = 'inaccuracy';
  } else if (isTopEngineChoice || winPctLoss < 1.5) {
    classification = 'best';
  } else if (winPctLoss < 3) {
    classification = 'excellent';
  } else {
    classification = 'good';
  }

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
