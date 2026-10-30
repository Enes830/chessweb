import fs from 'fs';
import { Chess } from 'chess.js';
import { classifyMove, calculatePlayerAccuracy, estimateEloFromAccuracy } from '../src/lib/engine/classifier.ts';
import { lookupOpening } from '../src/lib/openings.ts';

const data = JSON.parse(fs.readFileSync('/tmp/lichess_game.json', 'utf-8'));
const movesList = data.moves.split(' ');

const chess = new Chess();
const fenList = [chess.fen()];
const moveSteps = [];

for (let i = 0; i < movesList.length; i++) {
  const san = movesList[i];
  const fenBefore = chess.fen();
  const res = chess.move(san);
  if (!res) {
    console.error('Invalid move:', san);
    break;
  }
  const fenAfter = chess.fen();
  fenList.push(fenAfter);
  moveSteps.push({
    ply: i + 1,
    moveNumber: Math.floor(i / 2) + 1,
    turn: res.color,
    san: res.san,
    uci: res.from + res.to + (res.promotion || ''),
    from: res.from,
    to: res.to,
    fenBefore,
    fenAfter,
  });
}

// Convert Lichess eval points to our EngineEvalResult format
const analysis = data.analysis;
const evalResults = [];

// Starting pos
evalResults.push({
  depth: 20,
  scoreCp: 20,
  bestMove: 'e2e4',
  pv: ['e2e4'],
  multiPVEvals: [{ pvIndex: 1, scoreCp: 20, bestMove: 'e2e4', pv: ['e2e4'] }],
});

for (let i = 0; i < analysis.length; i++) {
  const a = analysis[i];
  const fenTurn = fenList[i + 1].split(' ')[1] || 'w';
  // Lichess stores eval from White's perspective
  const whiteCp = a.eval !== undefined ? a.eval : (a.mate !== undefined ? (a.mate > 0 ? 10000 : -10000) : 0);
  const bestMove = a.best || '';
  const pv = a.variation ? a.variation.split(' ') : (bestMove ? [bestMove] : []);

  evalResults.push({
    depth: 20,
    scoreCp: whiteCp,
    mate: a.mate,
    bestMove,
    pv,
    multiPVEvals: [{ pvIndex: 1, scoreCp: whiteCp, mate: a.mate, bestMove, pv }],
  });
}

// Book checking
let inBookSequence = true;
let deepestOpeningName;
const stepOpenings = new Array(moveSteps.length);
const isBookMoveStep = new Array(moveSteps.length).fill(false);

for (let i = 0; i < moveSteps.length; i++) {
  const match = lookupOpening(moveSteps[i].fenAfter);
  if (match) {
    stepOpenings[i] = match.name;
    deepestOpeningName = match.name;
    if (inBookSequence && moveSteps[i].ply <= 20) {
      isBookMoveStep[i] = true;
    }
  } else {
    inBookSequence = false;
  }
}

const analyzedMoves = [];
console.log('=== TESTING CHESSWEB ALGORITHM ON LICHESS GAME (Magnus Carlsen vs Night-King96) ===\n');

let matchCount = 0;
let totalJudged = 0;

for (let i = 0; i < moveSteps.length; i++) {
  const step = moveSteps[i];
  const evalBeforeObj = evalResults[i];
  const evalAfterObj = evalResults[i + 1];
  const prevMoveAnalysis = i > 0 ? analyzedMoves[i - 1] : undefined;
  const lichessJudgment = analysis[i]?.judgment?.name?.toLowerCase();

  const res = classifyMove({
    ply: step.ply,
    moveNumber: step.moveNumber,
    turn: step.turn,
    san: step.san,
    uci: step.uci,
    from: step.from,
    to: step.to,
    fenBefore: step.fenBefore,
    fenAfter: step.fenAfter,
    evalBeforeObj,
    evalAfterObj,
    prevMoveAnalysis,
    forceBook: isBookMoveStep[i],
  });

  const moveAnalysis = { ...step, ...res };
  analyzedMoves.push(moveAnalysis);

  if (lichessJudgment) {
    totalJudged++;
    const ourClass = res.classification;
    const isClose =
      ourClass === lichessJudgment ||
      (lichessJudgment === 'inaccuracy' && (ourClass === 'good' || ourClass === 'inaccuracy')) ||
      (lichessJudgment === 'mistake' && (ourClass === 'inaccuracy' || ourClass === 'mistake' || ourClass === 'missed_win')) ||
      (lichessJudgment === 'blunder' && (ourClass === 'blunder' || ourClass === 'missed_win' || ourClass === 'mistake'));
    if (isClose) matchCount++;

    console.log(
      `Move ${step.moveNumber}${step.turn === 'w' ? '.' : '...'} ${step.san.padEnd(7)} | ` +
      `Lichess: [${lichessJudgment.toUpperCase().padEnd(10)}] | ` +
      `Our App: [${ourClass.toUpperCase().padEnd(10)}] ` +
      `(eval: ${(res.evalAfterWhite / 100).toFixed(2)}, winLoss: ${res.winPctLoss.toFixed(1)}%)`
    );
  }
}

const wAcc = calculatePlayerAccuracy(analyzedMoves, 'w');
const bAcc = calculatePlayerAccuracy(analyzedMoves, 'b');
const wElo = estimateEloFromAccuracy(wAcc, analyzedMoves, 'w');
const bElo = estimateEloFromAccuracy(bAcc, analyzedMoves, 'b');

console.log('\n=== FINAL ACCURACY & ELO SUMMARY ===');
console.log(`White (${data.players.white.user.name} - Rating: ${data.players.white.rating}):`);
console.log(`  Accuracy: ${wAcc}% | Estimated Game Rating: ${wElo}`);
console.log(`Black (${data.players.black.user.name} - Rating: ${data.players.black.rating}):`);
console.log(`  Accuracy: ${bAcc}% | Estimated Game Rating: ${bElo}`);
console.log(`Judgment Alignment with Lichess Server: ${matchCount}/${totalJudged} (${Math.round((matchCount/totalJudged)*100)}%)`);
