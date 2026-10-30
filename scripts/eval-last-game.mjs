import { spawn } from 'child_process';
import { Chess } from 'chess.js';
import fs from 'fs';
import { classifyMove, calculatePlayerAccuracy } from '../src/lib/engine/classifier.ts';
import { lookupOpening } from '../src/lib/openings.ts';

const pgn = fs.readFileSync('/tmp/last_game.pgn', 'utf-8');
const chess = new Chess();
chess.loadPgn(pgn);
const history = chess.history({ verbose: true });

const replayChess = new Chess();
const fenList = [replayChess.fen()];
const moveSteps = [];

for (let i = 0; i < history.length; i++) {
  const h = history[i];
  const fenBefore = replayChess.fen();
  replayChess.move(h);
  const fenAfter = replayChess.fen();
  fenList.push(fenAfter);
  moveSteps.push({
    ply: i + 1,
    moveNumber: Math.floor(i / 2) + 1,
    turn: h.color,
    san: h.san,
    uci: h.from + h.to + (h.promotion || ''),
    from: h.from,
    to: h.to,
    fenBefore,
    fenAfter,
  });
}

async function evaluateAll() {
  const sf = spawn('/opt/homebrew/bin/stockfish');
  let currentResolve = null;
  let currentEval = { depth: 0, scoreCp: 0, bestMove: '', pv: [], multiPVEvals: [] };
  let currentFen = '';

  sf.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      if (line.startsWith('info ') && line.includes('score ')) {
        const tokens = line.split(/\s+/);
        let depth = 0;
        let scoreCp = undefined;
        let mate = undefined;
        let multiPV = 1;
        let pvIndex = -1;
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i] === 'depth') depth = parseInt(tokens[i + 1], 10);
          else if (tokens[i] === 'score') {
            if (tokens[i + 1] === 'cp') scoreCp = parseInt(tokens[i + 2], 10);
            else if (tokens[i + 1] === 'mate') mate = parseInt(tokens[i + 2], 10);
          } else if (tokens[i] === 'multipv') multiPV = parseInt(tokens[i + 1], 10);
          else if (tokens[i] === 'pv') { pvIndex = i + 1; break; }
        }
        const pvMoves = pvIndex !== -1 ? tokens.slice(pvIndex) : [];
        const bestMove = pvMoves[0] || '';
        const fenTurn = (currentFen.split(' ')[1] || 'w');
        if (fenTurn === 'b') {
          if (scoreCp !== undefined) scoreCp = -scoreCp;
          if (mate !== undefined) mate = -mate;
        }
        if (mate !== undefined && scoreCp === undefined) {
          scoreCp = mate > 0 ? (10000 - Math.abs(mate) * 100) : (-10000 + Math.abs(mate) * 100);
        }
        if (multiPV === 1 && depth >= currentEval.depth) {
          currentEval.depth = depth;
          if (scoreCp !== undefined) currentEval.scoreCp = scoreCp;
          currentEval.mate = mate;
          if (bestMove) currentEval.bestMove = bestMove;
          if (pvMoves.length > 0) currentEval.pv = pvMoves;
        }
        const existingPvIdx = currentEval.multiPVEvals.findIndex((p) => p.pvIndex === multiPV);
        const pvData = { pvIndex: multiPV, scoreCp, mate, bestMove, pv: pvMoves };
        if (existingPvIdx >= 0) currentEval.multiPVEvals[existingPvIdx] = pvData;
        else currentEval.multiPVEvals.push(pvData);
      }
      if (line.startsWith('bestmove')) {
        const parts = line.split(/\s+/);
        const uciBestMove = parts[1] || '';
        const pv1 = currentEval.multiPVEvals.find(p => p.pvIndex === 1);
        if (pv1?.bestMove) currentEval.bestMove = pv1.bestMove;
        else if (uciBestMove && uciBestMove !== '(none)') currentEval.bestMove = uciBestMove;
        currentEval.multiPVEvals.sort((a, b) => a.pvIndex - b.pvIndex);
        if (currentResolve) {
          const res = { ...currentEval };
          currentResolve(res);
        }
      }
    }
  });

  sf.stdin.write('uci\n');
  sf.stdin.write('setoption name MultiPV value 3\n');
  sf.stdin.write('isready\n');
  await new Promise(r => setTimeout(r, 200));

  const results = [];
  for (let i = 0; i < fenList.length; i++) {
    currentFen = fenList[i];
    currentEval = { depth: 0, scoreCp: 0, bestMove: '', pv: [], multiPVEvals: [] };
    const p = new Promise(r => { currentResolve = r; });
    sf.stdin.write('position fen ' + currentFen + '\n');
    sf.stdin.write('go depth 16\n');
    const res = await p;
    results.push(res);
  }
  sf.stdin.write('quit\n');
  return results;
}

evaluateAll().then((evalResults) => {
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
  console.log('=== REWINDBOARD MOVE EVALUATIONS ===');
  for (let i = 0; i < moveSteps.length; i++) {
    const step = moveSteps[i];
    const evalBeforeObj = evalResults[i];
    const evalAfterObj = evalResults[i + 1];
    const prevMoveAnalysis = i > 0 ? analyzedMoves[i - 1] : undefined;
    
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
    console.log(
      `${step.moveNumber}. ${step.turn === 'w' ? 'W' : 'B'}: ${step.san.padEnd(7)} -> ` +
      `[${res.classification.toUpperCase().padEnd(10)}] ` +
      `(eval: ${(res.evalAfterWhite / 100).toFixed(2)}, winLoss: ${res.winPctLoss.toFixed(1)}%, best: ${evalBeforeObj.bestMove})`
    );
  }

  const wAcc = calculatePlayerAccuracy(analyzedMoves, 'w');
  const bAcc = calculatePlayerAccuracy(analyzedMoves, 'b');
  console.log('=== ACCURACY SUMMARY ===');
  console.log('White Accuracy:', wAcc + '%', 'Estimated Elo:'(wAcc, analyzedMoves, 'w'));
  console.log('Black Accuracy:', bAcc + '%', 'Estimated Elo:'(bAcc, analyzedMoves, 'b'));
});
