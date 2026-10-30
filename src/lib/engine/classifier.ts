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

/** Lichess's public win-chance proxy; not Chess.com's private rating model. */
export function cpToWinPct(cp: number): number {
  return 100 / (1 + Math.exp(-0.00368208 * cp));
}

/** Public Lichess move-accuracy curve, without intermediate rounding. */
export function calculateMoveAccuracy(winPctLoss: number): number {
  if (winPctLoss <= 0) return 100;
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * winPctLoss) - 3.1669));
}

/** Volatility-weighted mean combined with harmonic mean, following Lichess's
 * published game-accuracy methodology. Labels never add penalties or bonuses.
 */
export function calculatePlayerAccuracy(moves: MoveAnalysis[], color: 'w' | 'b'): number {
  if (!moves.length) return 100;
  const whiteChances = [cpToWinPct(moves[0].evalBefore), ...moves.map(m => cpToWinPct(m.evalAfter))];
  const windowSize = Math.min(whiteChances.length, Math.max(2, Math.min(8, Math.floor(moves.length / 10))));
  const samples = moves.flatMap((move, index) => {
    if (move.turn !== color) return [];
    const start = Math.max(0, index - windowSize + 2);
    const window = whiteChances.slice(start, start + windowSize);
    const mean = window.reduce((sum, value) => sum + value, 0) / window.length;
    const deviation = Math.sqrt(window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / window.length);
    return [{ accuracy: calculateMoveAccuracy(move.winPctLoss), weight: Math.max(0.5, Math.min(12, deviation)) }];
  });
  if (!samples.length) return 100;
  const weighted = samples.reduce((sum, s) => sum + s.accuracy * s.weight, 0) / samples.reduce((sum, s) => sum + s.weight, 0);
  const harmonic = samples.some(s => s.accuracy === 0) ? 0 : samples.length / samples.reduce((sum, s) => sum + 1 / s.accuracy, 0);
  return Math.round((weighted + harmonic) / 2 * 10) / 10;
}

/** Published Chess.com loss bands, applied to our documented win-chance proxy.
 * Exact boundaries belong to the more severe band; zero loss is Best.
 */
export function classifyExpectedLoss(loss: number): MoveClassification {
  if (loss <= 0) return 'best';
  if (loss < 2) return 'excellent';
  if (loss < 5) return 'good';
  if (loss < 10) return 'inaccuracy';
  if (loss < 20) return 'mistake';
  return 'blunder';
}

function playerChances(evaluation: { scoreCp?: number; mate?: number }, sign: number): number {
  if (evaluation.mate !== undefined) return evaluation.mate * sign > 0 ? 100 : 0;
  return cpToWinPct((evaluation.scoreCp ?? 0) * sign);
}

/* ============================================================================
   Open-Source Classification Curve & Board Analysis
   Adapted from:
   1. WintrCat/freechess (src/lib/classification.ts, src/lib/board.ts, src/lib/analysis.ts)
   2. wdeloo/Brilliant-Chess & T-Julsgaard/Chess-Review (analysis.js)
   ============================================================================ */

export const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: Infinity,
  m: 0,
};

const SAC_VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export interface InfluencingPiece {
  square: Square;
  color: 'w' | 'b';
  type: string;
}

const PROMOTIONS: Array<'b' | 'n' | 'r' | 'q' | undefined> = [undefined, 'b', 'n', 'r', 'q'];

function oppColor(c: 'w' | 'b'): 'w' | 'b' {
  return c === 'w' ? 'b' : 'w';
}

function setFenTurn(fen: string, color: 'w' | 'b'): string {
  const fields = fen.trim().split(/\s+/);
  if (fields.length >= 4) {
    fields[1] = color;
    fields[3] = '-';
  }
  return fields.join(' ');
}

/**
 * WintrCat/freechess getAttackers: returns all enemy pieces that attack `square` in `fen`.
 */
export function getAttackers(fen: string, square: Square): InfluencingPiece[] {
  const attackers: InfluencingPiece[] = [];
  try {
    const board = new Chess(fen);
    const piece = board.get(square);
    if (!piece) return [];

    const enemyColor = oppColor(piece.color);
    const attackerSquares = board.attackers(square, enemyColor);
    for (const sq of attackerSquares) {
      const p = board.get(sq);
      if (p) {
        attackers.push({
          square: sq,
          color: p.color,
          type: p.type,
        });
      }
    }
  } catch {
    // Ignore invalid FEN states
  }
  return attackers;
}

/**
 * WintrCat/freechess getDefenders: returns all friendly pieces defending `square` in `fen`.
 */
export function getDefenders(fen: string, square: Square): InfluencingPiece[] {
  try {
    const board = new Chess(fen);
    const piece = board.get(square);
    if (!piece) return [];

    const testAttacker = getAttackers(fen, square)[0];
    if (testAttacker) {
      try {
        const flippedBoard = new Chess(setFenTurn(fen, testAttacker.color));
        for (const promotion of PROMOTIONS) {
          try {
            const moved = flippedBoard.move({
              from: testAttacker.square,
              to: square,
              promotion,
            });
            if (moved) {
              return getAttackers(flippedBoard.fen(), square);
            }
          } catch {
            // Try next promotion
          }
        }
      } catch {
        // Fallback to direct attackers check
      }
    }

    // Direct defenders via chess.js attackers() for friendly color
    const defenderSquares = board.attackers(square, piece.color);
    const defenders: InfluencingPiece[] = [];
    for (const sq of defenderSquares) {
      const p = board.get(sq);
      if (p) {
        defenders.push({
          square: sq,
          color: p.color,
          type: p.type,
        });
      }
    }
    return defenders;
  } catch {
    return [];
  }
}

/**
 * WintrCat/freechess isPieceHanging: checks whether the piece on `square` in `fen` is hanging
 * compared to `lastFen`.
 */
export function isPieceHanging(lastFen: string, fen: string, square: Square): boolean {
  try {
    const lastBoard = new Chess(lastFen);
    const board = new Chess(fen);

    const lastPiece = lastBoard.get(square) || { type: 'm', color: '' as any };
    const piece = board.get(square);
    if (!piece) return false;

    const attackers = getAttackers(fen, square);
    if (attackers.length === 0) return false;

    const defenders = getDefenders(fen, square);

    // If piece was just traded equally or better on this square, not hanging
    if (
      PIECE_VALUES[lastPiece.type] >= PIECE_VALUES[piece.type] &&
      lastPiece.color !== piece.color
    ) {
      return false;
    }

    // If a rook took a minor piece that was only defended by one other minor piece,
    // it was a favorable rook exchange, so rook is not hanging
    if (
      piece.type === 'r' &&
      PIECE_VALUES[lastPiece.type] === 3 &&
      attackers.every((atk) => PIECE_VALUES[atk.type] === 3) &&
      attackers.length === 1
    ) {
      return false;
    }

    // If piece has an attacker of lower value, it is hanging
    if (attackers.some((atk) => PIECE_VALUES[atk.type] < PIECE_VALUES[piece.type])) {
      return true;
    }

    if (attackers.length > defenders.length) {
      let minAttackerValue = Infinity;
      for (const attacker of attackers) {
        minAttackerValue = Math.min(PIECE_VALUES[attacker.type], minAttackerValue);
      }

      // If taking the piece even though it has more attackers than defenders
      // would be a sacrifice in itself, not hanging
      if (
        PIECE_VALUES[piece.type] < minAttackerValue &&
        defenders.some((dfn) => PIECE_VALUES[dfn.type] < minAttackerValue)
      ) {
        return false;
      }

      // If any of the piece's defenders are pawns, then the sacrificed piece
      // is the defending pawn.
      if (defenders.some((dfn) => PIECE_VALUES[dfn.type] === 1)) {
        return false;
      }

      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/* ============================================================================
   Static Exchange Evaluation (SEE) from wdeloo/Brilliant-Chess (MIT)
   ============================================================================ */

interface ExchangeBudget {
  nodes: number;
  maxNodes: number;
  memo?: Map<string, number>;
  captureMemo?: Map<string, number>;
}

function exchangeGain(chess: Chess, square: Square, budget: ExchangeBudget): number | null {
  const memo = budget.memo || (budget.memo = new Map());
  const key = chess.fen().split(' ').slice(0, 4).join(' ') + ':' + square;
  if (memo.has(key)) return memo.get(key)!;
  if (++budget.nodes > budget.maxNodes) return null;
  if (!chess.get(square) || !chess.attackers(square, chess.turn()).length) {
    memo.set(key, 0);
    return 0;
  }
  const legal = chess.moves({ verbose: true });
  const captures = legal.filter((m) => m.to === square && m.captured);
  if (!captures.length) {
    memo.set(key, 0);
    return 0;
  }
  let best = legal.length > captures.length ? 0 : -Infinity;
  for (const m of captures) {
    const reply = exchangeGain(new Chess(m.after), square, budget);
    if (reply === null) return null;
    const promotion = m.promotion ? (SAC_VAL[m.promotion] || 0) - SAC_VAL.p : 0;
    best = Math.max(best, (SAC_VAL[m.captured!] || 0) + promotion - reply);
  }
  memo.set(key, best);
  return best;
}

function couldBeSaved(
  chess: Chess,
  square: Square,
  color: 'w' | 'b',
  budget: ExchangeBudget = { nodes: 0, maxNodes: 128 }
): boolean {
  const piece = chess.get(square);
  if (!piece || piece.color !== color) return false;
  const legal = chess.moves({ verbose: true });
  if (!chess.attackers(square, oppColor(color)).length && legal.some((m) => m.from !== square)) {
    return true;
  }
  const sorted = [...legal].sort((a, b) => Number(a.from !== square) - Number(b.from !== square));
  for (const m of sorted) {
    const after = new Chess(m.after);
    const to = (m.from === square ? m.to : square) as Square;
    if (after.get(to)?.color !== color) continue;
    const gain = exchangeGain(after, to, budget);
    if (gain === null) return false;
    if (gain <= (SAC_VAL[m.captured || ''] || 0)) return true;
  }
  return false;
}

function captureMaterial(move: { captured?: string; promotion?: string }): number {
  return (
    (SAC_VAL[move.captured || ''] || 0) +
    (move.promotion ? (SAC_VAL[move.promotion] || 0) - SAC_VAL.p : 0)
  );
}

function shortCaptureGain(chess: Chess, plies: number, budget: ExchangeBudget): number | null {
  const memo = budget.captureMemo || (budget.captureMemo = new Map());
  const key = chess.fen().split(' ').slice(0, 4).join(' ') + ':' + plies;
  if (memo.has(key)) return memo.get(key)!;
  if (++budget.nodes > budget.maxNodes) return null;
  const legal = chess.moves({ verbose: true });
  if (!legal.length) {
    memo.set(key, 0);
    return 0;
  }
  const mustEvade = plies > 0 && chess.inCheck();
  const candidates = legal.filter((m) => m.captured || m.promotion || mustEvade);
  let best = legal.length > candidates.length ? 0 : -Infinity;
  for (const m of candidates) {
    const after = new Chess(m.after);
    const reply =
      plies > 0
        ? shortCaptureGain(after, plies - 1, budget)
        : exchangeGain(after, m.to as Square, budget);
    if (reply === null) return null;
    best = Math.max(best, captureMaterial(m) - reply);
  }
  memo.set(key, best);
  return best;
}

function hasLastingOffer(
  chess: Chess,
  square: Square,
  credit: number,
  budget: ExchangeBudget
): boolean {
  for (const m of chess.moves({ verbose: true }).filter((m) => m.to === square && m.captured)) {
    const recovery = shortCaptureGain(new Chess(m.after), 3, budget);
    if (recovery === null) return false;
    if (captureMaterial(m) - credit - recovery > 0) return true;
  }
  return false;
}

/**
 * Checks if a move is a genuine material sacrifice using both:
 * 1. Brilliant-Chess legal Static Exchange Evaluation (exchangeGain + couldBeSaved + hasLastingOffer)
 * 2. WintrCat/freechess hanging piece + pinned-attacker viability test
 */
export function isMaterialSacrifice(
  fenBefore: string,
  fenAfter: string,
  move: { from: string; to: string; san?: string },
  turn: 'w' | 'b'
): boolean {
  try {
    const before = new Chess(fenBefore);
    const after = new Chess(fenAfter);

    if (before.inCheck() || after.isCheckmate()) return false;
    if (move.san && move.san.includes('=')) return false;

    const fromSq = move.from as Square;
    const toSq = move.to as Square;
    const capturedPiece = before.get(toSq);
    const capturedVal = capturedPiece ? SAC_VAL[capturedPiece.type] || 0 : 0;

    // Method 1: Brilliant-Chess SEE verification
    const budget: ExchangeBudget = { nodes: 0, maxNodes: 128 };
    const recoveryBudget: ExchangeBudget = { nodes: 0, maxNodes: 512 };
    let priorThreats: Chess | null = null;

    const targets = after
      .board()
      .flat()
      .filter(
        (p): p is NonNullable<typeof p> =>
          Boolean(
            p &&
              p.color === turn &&
              ['n', 'b', 'r', 'q'].includes(p.type) &&
              after.attackers(p.square, oppColor(turn)).length > 0
          )
      );

    for (const piece of targets) {
      const square = piece.square;
      const same =
        before.get(square)?.color === piece.color && before.get(square)?.type === piece.type;
      const source = same ? square : fromSq;
      if (before.get(source)?.color !== piece.color || before.get(source)?.type !== piece.type) {
        continue;
      }

      const gain = exchangeGain(after, square, budget);
      if (gain !== null && gain > capturedVal) {
        let validOffer = true;
        if (same) {
          try {
            if (!priorThreats) {
              priorThreats = new Chess(setFenTurn(before.fen(), oppColor(turn)));
            }
            const previousGain = exchangeGain(priorThreats, square, budget);
            if (previousGain !== null && gain - capturedVal <= previousGain && !after.inCheck()) {
              validOffer = false;
            }
          } catch {
            // If flipping turn fails because opponent was in check, proceed
          }
        }

        if (
          validOffer &&
          couldBeSaved(before, source, turn, budget) &&
          hasLastingOffer(after, square, capturedVal, recoveryBudget)
        ) {
          return true;
        }
      }
    }

    // Method 2: WintrCat/freechess hanging piece + capture viability check
    const lastPiece = before.get(toSq) || { type: 'm' };
    const sacrificedPieces: InfluencingPiece[] = [];

    for (const row of after.board()) {
      for (const piece of row) {
        if (!piece || piece.color !== turn || piece.type === 'k' || piece.type === 'p') continue;
        if (PIECE_VALUES[lastPiece.type] >= PIECE_VALUES[piece.type]) continue;

        // If the piece wasn't moved, ensure it wasn't already hanging before
        if (piece.square !== toSq && isPieceHanging(fenBefore, fenBefore, piece.square)) {
          continue;
        }

        if (isPieceHanging(fenBefore, fenAfter, piece.square)) {
          sacrificedPieces.push(piece);
        }
      }
    }

    if (sacrificedPieces.length === 0) return false;

    let anyPieceViablyCapturable = false;
    const captureTestBoard = new Chess(fenAfter);
    const maxSackVal = Math.max(...sacrificedPieces.map((s) => PIECE_VALUES[s.type]));

    for (const piece of sacrificedPieces) {
      const attackers = getAttackers(fenAfter, piece.square);
      for (const attacker of attackers) {
        for (const promotion of PROMOTIONS) {
          try {
            const moved = captureTestBoard.move({
              from: attacker.square,
              to: piece.square,
              promotion,
            });
            if (!moved) continue;

            let attackerPinned = false;
            for (const row of captureTestBoard.board()) {
              for (const enemyPiece of row) {
                if (!enemyPiece || enemyPiece.color === captureTestBoard.turn()) continue;
                if (enemyPiece.type === 'k' || enemyPiece.type === 'p') continue;

                if (
                  isPieceHanging(fenAfter, captureTestBoard.fen(), enemyPiece.square) &&
                  PIECE_VALUES[enemyPiece.type] >= maxSackVal
                ) {
                  attackerPinned = true;
                  break;
                }
              }
              if (attackerPinned) break;
            }

            if (PIECE_VALUES[piece.type] >= 5) {
              if (!attackerPinned) {
                anyPieceViablyCapturable = true;
              }
            } else if (
              !attackerPinned &&
              !captureTestBoard.moves().some((m) => m.endsWith('#'))
            ) {
              anyPieceViablyCapturable = true;
            }

            captureTestBoard.undo();
            if (anyPieceViablyCapturable) break;
          } catch {
            // Ignore illegal capture
          }
        }
        if (anyPieceViablyCapturable) break;
      }
      if (anyPieceViablyCapturable) break;
    }

    return anyPieceViablyCapturable;
  } catch {
    return false;
  }
}

/**
 * Classifies a move using public loss bands and bounded sacrifice heuristics.
 */
export function classifyMove({
  ply,
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
  const sign = turn === 'w' ? 1 : -1;
  const beforeBoard = new Chess(fenBefore);
  const afterBoard = new Chess(fenAfter);
  const terminal = afterBoard.isGameOver();
  const bestMove = evalBeforeObj.bestMove || evalBeforeObj.multiPVEvals?.find(line => line.pvIndex === 1)?.bestMove;
  // UCI promotion suffix is part of the move, not optional identity information.
  const isTopEngineChoice = bestMove === uci;
  const matchingLine = evalBeforeObj.multiPVEvals?.find(line => line.bestMove === uci);
  const winPctBefore = playerChances(evalBeforeObj, sign);
  const rawAfter = terminal
    ? (afterBoard.isCheckmate() ? 100 : 50)
    : playerChances(evalAfterObj, sign);
  // Same-root estimates reduce horizon noise, but must never override an actual
  // terminal result or a change in forced-mate status discovered after the move.
  const sameMateStatus = Math.sign(evalBeforeObj.mate ?? 0) === Math.sign(evalAfterObj.mate ?? 0);
  const canCorrect = !terminal && sameMateStatus;
  const winPctAfter = canCorrect && isTopEngineChoice
    ? Math.max(winPctBefore, rawAfter)
    : canCorrect && matchingLine?.scoreCp !== undefined
      ? Math.max(rawAfter, playerChances(matchingLine, sign))
      : rawAfter;
  const isForcedMove = beforeBoard.moves().length === 1;
  const winPctLoss = isForcedMove ? 0 : Math.max(0, winPctBefore - winPctAfter);
  const isBookMove = ply <= 24 && Boolean(lookupOpening(fenAfter)) && winPctLoss < 2 && !(evalAfterObj.mate !== undefined && evalAfterObj.mate * sign < 0);
  let classification = isForcedMove ? 'best' as MoveClassification : classifyExpectedLoss(winPctLoss);
  if (isBookMove) classification = 'book';

  const secondLine = evalBeforeObj.multiPVEvals?.find(line => line.pvIndex === 2);
  const secondChances = secondLine ? playerChances(secondLine, sign) : undefined;
  const isSacrifice = !isBookMove && !isForcedMove && !terminal && winPctLoss < 2
    && isMaterialSacrifice(fenBefore, fenAfter, { from, to, san }, turn);
  if (!isBookMove && !isForcedMove && !terminal && secondChances !== undefined) {
    if (isSacrifice && winPctAfter >= 50 && secondChances < 95 && !san.includes('=')) {
      classification = 'brilliant';
    } else if (classification === 'best' && winPctAfter >= 50
      && winPctBefore - secondChances >= 20 && secondChances < 70) {
      classification = 'great';
    }
  }

  const opponentErred = prevMoveAnalysis && ['mistake', 'blunder', 'missed_win'].includes(prevMoveAnalysis.classification);
  if (opponentErred && winPctBefore >= 70 && winPctAfter <= 55 && winPctLoss >= 10) {
    classification = 'missed_win';
  }

  return {
    classification,
    winPctBefore,
    winPctAfter,
    winPctLoss,
    // Preserve actual engine scores for the graph, coaching and puzzle exports.
    evalBeforeWhite: evalBeforeObj.scoreCp ?? 0,
    evalAfterWhite: evalAfterObj.scoreCp ?? 0,
    pieceSacrificed: isSacrifice,
  };
}
