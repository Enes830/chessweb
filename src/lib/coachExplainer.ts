import { Chess, Square } from 'chess.js';
import { MoveAnalysis, MoveClassification } from '@/types/chess';
import { CLASSIFICATION_META } from '@/lib/engine/classifier';

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

/**
 * Deterministic tactical heuristic explanation generator for chess moves
 */
export function generateHeuristicExplanation(move: MoveAnalysis): string {
  const {
    classification,
    san,
    bestMoveSan,
    turn,
    from,
    to,
    fenBefore,
    fenAfter,
    winPctLoss,
    openingName,
    pieceSacrificed,
  } = move;

  const playerColor = turn === 'w' ? 'White' : 'Black';
  const opponentColor = turn === 'w' ? 'Black' : 'White';
  const opponentTurn = turn === 'w' ? 'b' : 'w';

  // 1. Book moves
  if (classification === 'book') {
    return openingName
      ? `Theory move in the ${openingName}. Developing quickly according to standard master opening play.`
      : 'Solid book move, developing pieces and preparing castling according to opening theory.';
  }

  // 2. Brilliant move
  if (classification === 'brilliant') {
    return `Brilliant move! You voluntarily sacrificed material with ${san}, which creates an unstoppable attack or wins back decisive material by force.`;
  }

  // 3. Great move
  if (classification === 'great') {
    return `Great find! ${san} was the only critical move that retains the advantage and refutes your opponent's setup. Alternative moves would have relinquished the edge.`;
  }

  // 4. Best move
  if (classification === 'best') {
    return `Excellent decision. ${san} is the top computer recommendation, maintaining ideal piece coordination, controlling key squares, and putting maximum pressure on ${opponentColor}.`;
  }

  // 5. Excellent & Good
  if (classification === 'excellent' || classification === 'good') {
    return `${san} is a solid and natural move that keeps your position strong. The engine slightly preferred ${bestMoveSan}, but your choice remains completely sound.`;
  }

  // Tactical inspection for mistakes & blunders
  try {
    const chessBefore = new Chess(fenBefore);
    const pieceMoved = chessBefore.get(from as Square);
    const pieceName = pieceMoved ? PIECE_NAMES[pieceMoved.type] : 'piece';

    const chessAfter = new Chess(fenAfter);
    const isCheck = chessAfter.inCheck();
    const isAttacked = chessAfter.isAttacked(to as Square, opponentTurn);

    // 6. Missed Win
    if (classification === 'missed_win') {
      return `Missed Win! You had a decisive winning opportunity. Playing ${bestMoveSan} would have sealed the victory immediately, whereas ${san} gave ${opponentColor} a way back into the game.`;
    }

    // 7. Blunder (??)
    if (classification === 'blunder') {
      if (isAttacked && pieceMoved && pieceMoved.type !== 'p') {
        return `Blunder (??): ${san} hangs your ${pieceName} on ${to} to opponent's attack with no compensation. ${bestMoveSan} was essential to keep your position intact.`;
      }

      if (winPctLoss >= 35) {
        return `Severe blunder! ${san} dramatically tilts the evaluation in favor of ${opponentColor}. You missed ${bestMoveSan}, which was the critical continuation.`;
      }

      return `Blunder! Playing ${san} gives away a substantial advantage. The engine recommends ${bestMoveSan} to maintain optimal piece activity and king safety.`;
    }

    // 8. Mistake (?)
    if (classification === 'mistake') {
      if (isAttacked && pieceMoved) {
        return `Mistake (?): Moving the ${pieceName} to ${to} allows ${opponentColor} to target your position and win tactical tempo. Better was ${bestMoveSan}.`;
      }
      return `Mistake: ${san} relinquishes significant initiative. ${bestMoveSan} was much more active and keeps the pressure on your opponent.`;
    }

    // 9. Inaccuracy (?!)
    if (classification === 'inaccuracy') {
      return `Inaccuracy (?!): ${san} is slightly imprecise. ${bestMoveSan} was more energetic and would have maintained better central control.`;
    }
  } catch (e) {
    console.error('Heuristic explanation generation error:', e);
  }

  return `${playerColor} played ${san}. The best move was ${bestMoveSan}.`;
}

/**
 * Explains a move with fallback to AI API route if configured
 */
export async function getMoveExplanation(move: MoveAnalysis): Promise<string> {
  const heuristic = generateHeuristicExplanation(move);

  // If running in browser and API key may be configured on server, attempt /api/explain
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          san: move.san,
          bestMoveSan: move.bestMoveSan,
          classification: move.classification,
          fenBefore: move.fenBefore,
          fenAfter: move.fenAfter,
          turn: move.turn,
          openingName: move.openingName,
          winPctLoss: move.winPctLoss,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.explanation) {
          return data.explanation;
        }
      }
    } catch {
      // Fallback silently to heuristic
    }
  }

  return heuristic;
}
