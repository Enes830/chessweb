// Source: https://github.com/lichess-org/chess-openings (CC0).
// Generate legal position keys offline; never infer turn or castling from placement.
import { Chess } from 'chess.js';
import { writeFile } from 'node:fs/promises';
const positions = new Map();
for (const volume of ['a', 'b', 'c', 'd', 'e']) {
  const response = await fetch(`https://raw.githubusercontent.com/lichess-org/chess-openings/master/${volume}.tsv`);
  if (!response.ok) throw new Error(`Opening download failed: ${response.status}`);
  for (const row of (await response.text()).trim().split('\n').slice(1)) {
    const [eco, name, pgn] = row.split('\t');
    const game = new Chess();
    game.loadPgn(pgn);
    const history = game.history({ verbose: true });
    for (const [index, move] of history.entries()) {
      const fen = move.after.split(' ').slice(0, 4).join(' ');
      if (!positions.has(fen) || index === history.length - 1) positions.set(fen, { eco, name, fen });
    }
  }
}
await writeFile(new URL('../src/lib/openingsData.json', import.meta.url), '[\n' + [...positions.values()].map(entry => JSON.stringify(entry)).join(',\n') + '\n]\n');
console.log(`Generated ${positions.size} exact opening positions.`);
