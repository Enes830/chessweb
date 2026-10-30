import { Chess } from 'chess.js';

/** chess.js history carries the authoritative before/after FEN, including PGN
 * SetUp/FEN headers, Black-to-move starts, promotions and fullmove numbers.
 */
export function buildGamePositions(pgn: string) {
  const game = new Chess();
  game.loadPgn(pgn);
  const history = game.history({ verbose: true });
  if (!history.length) throw new Error('No moves found in PGN');
  const moveSteps = history.map((move, index) => ({
    ply: index + 1,
    moveNumber: Number(move.before.split(' ')[5]),
    turn: move.color,
    san: move.san,
    uci: `${move.from}${move.to}${move.promotion || ''}`,
    from: move.from,
    to: move.to,
    fenBefore: move.before,
    fenAfter: move.after,
  }));
  return { moveSteps, fenList: [history[0].before, ...history.map(move => move.after)] };
}
