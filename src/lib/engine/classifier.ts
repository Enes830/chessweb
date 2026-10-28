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
    color: '#1baca6',
    bgColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    description: 'A brilliant move! You found the best move, sacrificing material for decisive compensation.',
  },
  great: {
    type: 'great',
    symbol: '!',
    name: 'Great',
    color: '#5c8bb0',
    bgColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    description: 'A great find! The only move that maintains the advantage or escapes trouble.',
  },
  best: {
    type: 'best',
    symbol: '★',
    name: 'Best',
    color: '#95bb4a',
    bgColor: 'bg-lime-500/20 text-lime-400 border-lime-500/40',
    description: 'The best move recommended by the engine.',
  },
  excellent: {
    type: 'excellent',
    symbol: '✓',
    name: 'Excellent',
    color: '#96bc4b',
    bgColor: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
    description: 'An excellent move that keeps almost all of your advantage.',
  },
  good: {
    type: 'good',
    symbol: '✓',
    name: 'Good',
    color: '#a3e635',
    bgColor: 'bg-green-500/15 text-green-300 border-green-500/30',
    description: 'A solid, natural move.',
  },
  book: {
    type: 'book',
    symbol: '📖',
    name: 'Book',
    color: '#d5a47d',
    bgColor: 'bg-amber-600/20 text-amber-300 border-amber-600/30',
    description: 'Standard opening theory.',
  },
  inaccuracy: {
    type: 'inaccuracy',
    symbol: '?!',
    name: 'Inaccuracy',
    color: '#f0c15c',
    bgColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    description: 'An inaccuracy. This move surrendered some of your advantage.',
  },
  mistake: {
    type: 'mistake',
    symbol: '?',
    name: 'Mistake',
    color: '#e69d35',
    bgColor: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    description: 'A mistake that worsened your position considerably.',
  },
  blunder: {
    type: 'blunder',
    symbol: '??',
    name: 'Blunder',
    color: '#ca3431',
    bgColor: 'bg-red-500/20 text-red-400 border-red-500/40',
    description: 'A critical blunder that drastically shifts the game balance.',
  },
  missed_win: {
    type: 'missed_win',
    symbol: '❌',
    name: 'Missed Win',
    color: '#dbac16',
    bgColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    description: 'A missed win. You had a winning position but missed the decisive blow.',
  },
};

/**
 * Standard Lichess / Chess.com sigmoid formula converting centipawns to Win Percentage (0-100%)
 */
export function cpToWinPct(cp: number): number {
  // Cap at extreme values to prevent overflow
  const clampedCp = Math.max(-2000, Math.min(2000, cp));
  const winPct = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clampedCp)) - 1);
  return Math.max(0, Math.min(100, winPct));
}

/**
 * Converts mate score to centipawns
 */
export function mateToCp(mateMoves: number): number {
  if (mateMoves > 0) {
    return Math.max(9000, 10000 - mateMoves * 100);
  }
  return Math.min(-9000, -10000 - mateMoves * 100);
}

/**
 * Standard piece values for material calculation
 */
const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

function getMaterial(chess: Chess, color: 'w' | 'b'): number {
  let mat = 0;
  const board = chess.board();
  for (const row of board) {
    for (const sq of row) {
      if (sq && sq.color === color) {
        mat += PIECE_VALUES[sq.type] || 0;
      }
    }
  }
  return mat;
}

/**
 * Determines whether a move involves a genuine piece sacrifice
 */
function isMaterialSacrifice(fenBefore: string, moveUci: string, turn: 'w' | 'b'): boolean {
  try {
    const chessBefore = new Chess(fenBefore);
    const opponentColor = turn === 'w' ? 'b' : 'w';

    const from = moveUci.slice(0, 2);
    const to = moveUci.slice(2, 4);
    const piece = chessBefore.get(from as any);
    if (!piece || (PIECE_VALUES[piece.type] || 0) < 3) {
      return false;
    }

    const matPlayerBefore = getMaterial(chessBefore, turn);
    const matOppBefore = getMaterial(chessBefore, opponentColor);

    const chessAfter = new Chess(fenBefore);
    const moveResult = chessAfter.move({
      from,
      to,
      promotion: moveUci.length > 4 ? (moveUci[4] as any) : undefined,
    });
    if (!moveResult) return false;

    // Check if the piece moved into an attacked square without immediate equal trade
    const matPlayerAfter = getMaterial(chessAfter, turn);
    const matOppAfter = getMaterial(chessAfter, opponentColor);
    const playerMatDiff = (matPlayerBefore - matOppBefore) - (matPlayerAfter - matOppAfter);

    // If player lost material (e.g. piece was captured or placed in capture)
    // or piece moved to square attacked by opponent pawns/pieces with lower value
    const isAttacked = chessAfter.isAttacked(to as any, opponentColor);
    if (isAttacked && (PIECE_VALUES[piece.type] || 0) >= 3) {
      return true;
    }

    return playerMatDiff >= 2;
  } catch {
    return false;
  }
}

export interface MoveClassificationParams {
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
}

/**
 * Classifies a move according to Chess.com review rules
 */
export function classifyMove(params: MoveClassificationParams): {
  classification: MoveClassification;
  evalBeforeWhite: number;
  evalAfterWhite: number;
  winPctBefore: number;
  winPctAfter: number;
  winPctLoss: number;
  pieceSacrificed: boolean;
} {
  const {
    ply,
    turn,
    uci,
    fenBefore,
    fenAfter,
    evalBeforeObj,
    evalAfterObj,
    prevMoveAnalysis,
  } = params;

  // Stockfish evaluation before the move (from side to move's perspective in engine)
  const cpBeforeRaw = evalBeforeObj.mate !== undefined
    ? mateToCp(evalBeforeObj.mate)
    : (evalBeforeObj.scoreCp ?? 0);

  // Stockfish evaluation after the move (from the OTHER side's perspective in engine)
  const cpAfterRawOther = evalAfterObj.mate !== undefined
    ? mateToCp(evalAfterObj.mate)
    : (evalAfterObj.scoreCp ?? 0);

  // Normalized to moving player's perspective:
  const playerEvalBefore = cpBeforeRaw;
  const playerEvalAfter = -cpAfterRawOther;

  // Normalized to White's perspective for display & graphs:
  const evalBeforeWhite = turn === 'w' ? playerEvalBefore : -playerEvalBefore;
  const evalAfterWhite = turn === 'w' ? playerEvalAfter : -playerEvalAfter;

  const winPctBefore = cpToWinPct(playerEvalBefore);
  const winPctAfter = cpToWinPct(playerEvalAfter);
  const winPctLoss = Math.max(0, winPctBefore - winPctAfter);

  // 1. Check for Book Move (First 6 moves = 12 plies matching opening book)
  if (ply <= 12) {
    const openingMatch = lookupOpening(fenAfter);
    if (openingMatch) {
      return {
        classification: 'book',
        evalBeforeWhite,
        evalAfterWhite,
        winPctBefore,
        winPctAfter,
        winPctLoss: 0,
        pieceSacrificed: false,
      };
    }
  }

  const bestMoveUci = evalBeforeObj.bestMove || '';
  const isTopChoice = uci === bestMoveUci || winPctLoss <= 0.5;

  // MultiPV diff: eval diff between best and second best move
  let multiPvGap = 0;
  if (evalBeforeObj.multiPVEvals && evalBeforeObj.multiPVEvals.length >= 2) {
    const pv1 = evalBeforeObj.multiPVEvals[0];
    const pv2 = evalBeforeObj.multiPVEvals[1];
    const score1 = pv1.mate !== undefined ? mateToCp(pv1.mate) : (pv1.scoreCp ?? 0);
    const score2 = pv2.mate !== undefined ? mateToCp(pv2.mate) : (pv2.scoreCp ?? 0);
    multiPvGap = (score1 - score2) / 100; // in pawns
  }

  const pieceSacrificed = isMaterialSacrifice(fenBefore, uci, turn);

  // 2. Brilliant Move (!!)
  // Move is top choice (or within 15cp), maintains winning/advantageous eval (>= +1.2 pawns = 120cp),
  // and involves a material sacrifice with MultiPV1 - MultiPV2 >= 1.5 pawns
  if (
    isTopChoice &&
    playerEvalAfter >= 120 &&
    pieceSacrificed &&
    multiPvGap >= 1.5
  ) {
    return {
      classification: 'brilliant',
      evalBeforeWhite,
      evalAfterWhite,
      winPctBefore,
      winPctAfter,
      winPctLoss,
      pieceSacrificed: true,
    };
  }

  // 3. Great Move (!)
  // The ONLY move that saves a position or finds a narrow tactical line
  // (MultiPV gap >= 1.5 pawns, non-sacrifice, and top choice)
  if (isTopChoice && multiPvGap >= 1.5 && !pieceSacrificed) {
    return {
      classification: 'great',
      evalBeforeWhite,
      evalAfterWhite,
      winPctBefore,
      winPctAfter,
      winPctLoss,
      pieceSacrificed: false,
    };
  }

  // 4. Missed Win
  // Opponent blundered on previous ply giving player >= +2.0 pawns (200cp),
  // and player's reply dropped the eval below +0.5 pawns (50cp)
  if (
    prevMoveAnalysis &&
    playerEvalBefore >= 200 &&
    playerEvalAfter < 50
  ) {
    return {
      classification: 'missed_win',
      evalBeforeWhite,
      evalAfterWhite,
      winPctBefore,
      winPctAfter,
      winPctLoss,
      pieceSacrificed,
    };
  }

  // 5. Blunder (??) - Win probability drops >= 20%
  if (winPctLoss >= 20) {
    return {
      classification: 'blunder',
      evalBeforeWhite,
      evalAfterWhite,
      winPctBefore,
      winPctAfter,
      winPctLoss,
      pieceSacrificed,
    };
  }

  // 6. Mistake (?) - Win probability drops 10% to 19.9%
  if (winPctLoss >= 10) {
    return {
      classification: 'mistake',
      evalBeforeWhite,
      evalAfterWhite,
      winPctBefore,
      winPctAfter,
      winPctLoss,
      pieceSacrificed,
    };
  }

  // 7. Inaccuracy (?!) - Win probability drops 5% to 9.9%
  if (winPctLoss >= 5) {
    return {
      classification: 'inaccuracy',
      evalBeforeWhite,
      evalAfterWhite,
      winPctBefore,
      winPctAfter,
      winPctLoss,
      pieceSacrificed,
    };
  }

  // 8. Best / Excellent / Good (winPctLoss < 5%)
  if (isTopChoice || winPctLoss < 0.8) {
    return {
      classification: 'best',
      evalBeforeWhite,
      evalAfterWhite,
      winPctBefore,
      winPctAfter,
      winPctLoss,
      pieceSacrificed,
    };
  }

  if (winPctLoss < 2.5) {
    return {
      classification: 'excellent',
      evalBeforeWhite,
      evalAfterWhite,
      winPctBefore,
      winPctAfter,
      winPctLoss,
      pieceSacrificed,
    };
  }

  return {
    classification: 'good',
    evalBeforeWhite,
    evalAfterWhite,
    winPctBefore,
    winPctAfter,
    winPctLoss,
    pieceSacrificed,
  };
}

/**
 * Calculates CAPS-style move accuracy (0-100%) from win probability loss
 * Formula: 103.1668 * exp(-0.04354 * winPctLoss) - 3.1669
 */
export function calculateMoveAccuracy(winPctLoss: number): number {
  if (winPctLoss <= 0) return 100;
  const acc = 103.1668 * Math.exp(-0.04354 * winPctLoss) - 3.1669;
  return Math.max(0, Math.min(100, acc));
}

/**
 * Computes overall accuracy for White or Black (0-100%)
 */
export function calculatePlayerAccuracy(moves: MoveAnalysis[], turn: 'w' | 'b'): number {
  const playerMoves = moves.filter((m) => m.turn === turn && m.classification !== 'book');
  if (playerMoves.length === 0) return 100;

  const totalAcc = playerMoves.reduce((sum, m) => {
    return sum + calculateMoveAccuracy(m.winPctLoss);
  }, 0);

  const avg = totalAcc / playerMoves.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Estimates player Elo performance based on accuracy percentage
 */
export function estimateEloFromAccuracy(accuracy: number): number {
  if (accuracy >= 98) return 2700;
  if (accuracy >= 95) return 2400 + (accuracy - 95) * 100;
  if (accuracy >= 90) return 2100 + (accuracy - 90) * 60;
  if (accuracy >= 80) return 1600 + (accuracy - 80) * 50;
  if (accuracy >= 70) return 1200 + (accuracy - 70) * 40;
  if (accuracy >= 60) return 900 + (accuracy - 60) * 30;
  if (accuracy >= 50) return 600 + (accuracy - 50) * 30;
  return Math.max(400, Math.round(400 + accuracy * 4));
}
