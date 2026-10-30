require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Chess } = require('chess.js');
const { classifyMove, classifyExpectedLoss, calculateMoveAccuracy, calculatePlayerAccuracy } = require('../src/lib/engine/classifier.ts');
const { lookupOpening } = require('../src/lib/openings.ts');
const { buildGamePositions } = require('../src/lib/engine/gamePositions.ts');
const { StockfishWorkerClient, getStockfishClient } = require('../src/lib/engine/workerClient.ts');
const initial = new Chess().fen();
const evaluation = (scoreCp, bestMove = '', extra = {}) => ({ depth: 16, scoreCp, bestMove, pv: bestMove ? [bestMove] : [], multiPVEvals: [], ...extra });
function classify(fen, san, before, after, extra = {}) {
  const board = new Chess(fen);
  const move = board.move(san);
  return classifyMove({ ply: 30, moveNumber: 15, turn: move.color, san: move.san, uci: move.lan, from: move.from, to: move.to, fenBefore: fen, fenAfter: board.fen(), evalBeforeObj: before, evalAfterObj: after, ...extra });
}

test('all published loss bands and boundaries', () => {
  const cases = [[0,'best'], [0.01,'excellent'], [1.99,'excellent'], [2,'good'], [4.99,'good'], [5,'inaccuracy'], [9.99,'inaccuracy'], [10,'mistake'], [19.99,'mistake'], [20,'blunder'], [100,'blunder']];
  for (const [loss, label] of cases) assert.equal(classifyExpectedLoss(loss), label);
});

test('underpromotion to a drawn knight ending is not the best queen promotion', () => {
  const result = classify('8/P7/7k/8/8/8/8/7K w - - 0 40', 'a8=N', evaluation(900, 'a7a8q'), evaluation(0));
  assert.equal(result.classification, 'blunder');
  assert.ok(result.winPctLoss > 40);
  assert.equal(result.evalAfterWhite, 0);
});

test('same-root horizon correction preserves raw engine evaluation', () => {
  const result = classify(initial, 'e4', evaluation(30, 'e2e4'), evaluation(-50));
  assert.equal(result.classification, 'best');
  assert.equal(result.winPctLoss, 0);
  assert.equal(result.evalAfterWhite, -50);
});

test('a discovered forced mate cannot be hidden by top-choice correction', () => {
  const result = classify(initial, 'f3', evaluation(0, 'f2f3'), evaluation(-9000, '', { mate: -9 }));
  assert.equal(result.classification, 'blunder');
  assert.equal(result.winPctLoss, 50);
});

test('white and black losses have symmetric labels', () => {
  const board = new Chess(); board.move('e4');
  const white = classify(initial, 'd4', evaluation(0, 'e2e4'), evaluation(-150));
  const black = classify(board.fen(), 'd5', evaluation(0, 'e7e5'), evaluation(150));
  assert.equal(white.classification, black.classification);
  assert.equal(white.winPctLoss, black.winPctLoss);
});

test('miss requires an opponent error, not just a lost advantage', () => {
  const ordinary = classify(initial, 'd4', evaluation(400, 'e2e4'), evaluation(0));
  const missed = classify(initial, 'd4', evaluation(400, 'e2e4'), evaluation(0), { prevMoveAnalysis: { classification: 'mistake' } });
  assert.equal(ordinary.classification, 'blunder');
  assert.equal(missed.classification, 'missed_win');
});

test('a unique move preserving equality can be Great', () => {
  const before = evaluation(0, 'e2e4', { multiPVEvals: [{ pvIndex: 2, scoreCp: -400, bestMove: 'd2d4', pv: ['d2d4'] }] });
  assert.equal(classify(initial, 'e4', before, evaluation(0)).classification, 'great');
});

test('opening identity preserves turn, castling and en-passant', () => {
  const board = new Chess(); board.move('e4'); const fen = board.fen();
  assert.ok(lookupOpening(fen));
  assert.equal(lookupOpening(fen.replace(' b ', ' w ')), null);
  assert.equal(lookupOpening(fen.replace(' KQkq ', ' - ')), null);
  assert.equal(lookupOpening(fen.replace(' KQkq - ', ' KQkq e3 ')), null);
  assert.ok(lookupOpening(fen.replace('0 1', '11 25')));
});

test('an opening database entry never masks a large evaluation loss', () => {
  assert.notEqual(classify(initial, 'e4', evaluation(0, 'd2d4'), evaluation(-400), { ply: 1 }).classification, 'book');
  assert.equal(classify(initial, 'e4', evaluation(20, 'e2e4'), evaluation(20), { ply: 1 }).classification, 'book');
});

test('custom PGN starts preserve Black turn, fullmove number and promotion', () => {
  const pgn = '[SetUp "1"]\n[FEN "7k/8/8/8/8/7K/p7/8 b - - 0 40"]\n\n40... a1=Q *';
  const { moveSteps, fenList } = buildGamePositions(pgn);
  assert.equal(moveSteps[0].turn, 'b');
  assert.equal(moveSteps[0].moveNumber, 40);
  assert.equal(moveSteps[0].uci, 'a2a1q');
  assert.equal(fenList[0], '7k/8/8/8/8/7K/p7/8 b - - 0 40');
  assert.equal(fenList.length, 2);
});

test('accuracy depends on loss, never classification labels', () => {
  const moves = [0, 10, 20].map(loss => ({ turn: 'w', evalBefore: 0, evalAfter: -100, winPctLoss: loss, classification: 'blunder' }));
  assert.equal(calculatePlayerAccuracy(moves, 'w'), calculatePlayerAccuracy(moves.map(m => ({...m, classification:'brilliant'})), 'w'));
  assert.equal(calculateMoveAccuracy(0), 100);
  assert.ok(calculateMoveAccuracy(20) < calculateMoveAccuracy(10));
  assert.equal(calculatePlayerAccuracy(moves.map(m => ({...m, winPctLoss:0})), 'w'), 100);
  assert.equal(calculatePlayerAccuracy([{...moves[0], winPctLoss:100}], 'w'), 0);
});

class FakeWorker {
  static instances = [];
  commands = [];
  constructor() { FakeWorker.instances.push(this); }
  postMessage(command) { this.commands.push(command); }
  terminate() { this.terminated = true; }
  emit(data) { this.onmessage?.({data}); }
}
function client(t, timeouts = {ready: 200, search: 200, stop: 200}, ready = true) {
  global.window = {};
  global.Worker = FakeWorker;
  const engine = new StockfishWorkerClient(timeouts);
  const worker = FakeWorker.instances.at(-1);
  if (ready) worker.emit('readyok');
  t.after(() => engine.terminate());
  return {engine, worker};
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('worker score normalization, exact MultiPV and bound filtering', async t => {
  const {engine,worker} = client(t);
  const board = new Chess(); board.move('e4');
  const promise = engine.evaluatePosition(board.fen()); await tick();
  worker.emit('info depth 16 multipv 1 score cp 80 pv e7e5\ninfo depth 16 multipv 2 score cp 50 pv c7c5');
  worker.emit('info depth 17 multipv 1 score cp 999 lowerbound pv d7d5');
  worker.emit('bestmove e7e5');
  const result = await promise;
  assert.equal(result.scoreCp, -80);
  assert.equal(result.multiPVEvals[1].scoreCp, -50);
  assert.equal(result.bestMove, 'e7e5');
});

test('terminal draw bypasses engine and returns zero', async t => {
  const {engine,worker} = client(t);
  const result = await engine.evaluatePosition('8/8/7k/8/8/8/8/7K w - - 0 1');
  assert.equal(result.scoreCp, 0);
  assert.equal(worker.commands.some(c => c.startsWith('go ')), false);
});

test('worker errors reject active and queued searches', async t => {
  const {engine,worker} = client(t);
  const active = assert.rejects(engine.evaluatePosition(initial), /failed/);
  const queued = assert.rejects(engine.evaluatePosition(initial), /failed/);
  await tick(); worker.onerror({message:'worker failed'});
  await Promise.all([active,queued]); assert.equal(engine.unavailable, true);
});

test('startup timeout settles readiness', async t => {
  const {engine} = client(t, {ready:10,search:200,stop:200}, false);
  await assert.rejects(engine.waitReady(), /startup timed out/);
});

test('search timeout settles pending evaluation', async t => {
  const {engine} = client(t, {ready:200,search:10,stop:200});
  await assert.rejects(engine.evaluatePosition(initial), /evaluation timed out/);
});

test('cancellation rejects work and drains old bestmove before next search', async t => {
  const {engine,worker} = client(t);
  const active = assert.rejects(engine.evaluatePosition(initial), /cancelled/);
  const queued = assert.rejects(engine.evaluatePosition(initial), /cancelled/);
  await tick(); engine.stopAndClearQueue();
  const next = engine.evaluatePosition(initial); await tick();
  assert.equal(worker.commands.filter(c => c.startsWith('go ')).length, 1);
  worker.emit('info depth 20 score cp 999 pv a2a3\nbestmove a2a3');
  assert.equal(worker.commands.filter(c => c.startsWith('go ')).length, 2);
  worker.emit('info depth 16 score cp 30 pv e2e4\nbestmove e2e4');
  assert.equal((await next).scoreCp, 30);
  await Promise.all([active,queued]);
});

test('cancellation timeout rejects a replacement waiting behind stop', async t => {
  const {engine} = client(t, {ready:200,search:200,stop:10});
  const old = assert.rejects(engine.evaluatePosition(initial), /cancelled/);
  await tick(); engine.stopAndClearQueue();
  await assert.rejects(engine.evaluatePosition(initial), /cancellation timed out/);
  await old;
});

test('termination rejects readiness and singleton can recover', async t => {
  const {engine} = client(t, undefined, false);
  const waiting = assert.rejects(engine.waitReady(), /terminated/);
  engine.terminate(); await waiting;
  const first = getStockfishClient(); first.terminate();
  const second = getStockfishClient();
  assert.notEqual(second,first); second.terminate();
});

test('empty engine response is an error, never fabricated best move', async t => {
  const {engine,worker} = client(t);
  const pending = assert.rejects(engine.evaluatePosition(initial), /no usable evaluation/);
  await tick(); worker.emit('bestmove (none)'); await pending;
});

test('cancellation before readiness rejects evaluation immediately', async t => {
  const {engine} = client(t, undefined, false);
  const pending = assert.rejects(engine.evaluatePosition(initial), /cancelled/);
  engine.stopAndClearQueue();
  await pending;
});

test('live replacement rejects old work without leaking its result', async t => {
  const {engine,worker} = client(t);
  const first = assert.rejects(engine.evaluateLivePosition(initial), /cancelled/);
  await tick();
  const second = engine.evaluateLivePosition(initial); await tick();
  worker.emit('info depth 12 score cp 500 pv a2a3\nbestmove a2a3');
  worker.emit('info depth 14 score cp 25 pv e2e4\nbestmove e2e4');
  assert.equal((await second).scoreCp,25);
  await first;
});

test('mate in a long line keeps its sign after White normalization', async t => {
  const {engine,worker} = client(t);
  const pending = engine.evaluatePosition(initial); await tick();
  worker.emit('info depth 16 score mate 101 pv e2e4\nbestmove e2e4');
  const result = await pending;
  assert.equal(result.mate, 101);
  assert.ok(result.scoreCp > 0);
});

test('opening data contains valid full position keys', () => {
  const data = require('../src/lib/openingsData.json');
  for (const opening of data) {
    assert.equal(opening.fen.split(' ').length,4);
    assert.doesNotThrow(() => new Chess(opening.fen + ' 0 1'));
  }
});

test('Opera Game queen sacrifice is Brilliant only when a winning alternative is absent', () => {
  const game = new Chess();
  game.loadPgn('1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7');
  const before = evaluation(9800, 'b3b8', { mate:2, multiPVEvals:[{pvIndex:2,scoreCp:300,bestMove:'d1d7',pv:['d1d7']}] });
  const after = evaluation(9900, '', {mate:1});
  assert.equal(classify(game.fen(), 'Qb8+', before, after).classification, 'brilliant');
  before.multiPVEvals[0].scoreCp = 9900;
  before.multiPVEvals[0].mate = 3;
  assert.equal(classify(game.fen(), 'Qb8+', before, after).classification, 'best');
});

test('evaluateGamePositions evaluates reverse order, skips forced-move engine calls, and uses MultiPV 1 for book & final plies', async t => {
  const { engine, worker } = client(t);
  const forcedStart = '6k1/p7/8/8/8/8/6q1/7K w - - 0 1';
  const b = new Chess(forcedStart);
  assert.equal(b.moves().length, 1);
  b.move('Kxg2');
  const afterForced = b.fen();

  const progressCalls = [];
  const promise = engine.evaluateGamePositions(
    [forcedStart, afterForced],
    16,
    2,
    (pct, cur, total) => progressCalls.push({ pct, cur, total })
  );

  await tick();
  worker.emit('readyok');
  await tick();

  const goCommands = worker.commands.filter(c => c.startsWith('go '));
  assert.equal(goCommands.length, 1);
  worker.emit('info depth 16 multipv 1 score cp 200 pv g8f7\nbestmove g8f7');
  const results = await promise;

  assert.equal(results.length, 2);
  assert.equal(worker.commands.filter(c => c.startsWith('go ')).length, 1);
  assert.equal(results[1].scoreCp, -200);
  assert.equal(results[0].scoreCp, -200);
  assert.equal(results[0].bestMove, 'h1g2');
  assert.deepEqual(results[0].pv, ['h1g2', 'g8f7']);
  assert.equal(progressCalls.length, 2);
  assert.equal(progressCalls.at(-1).pct, 100);
});

test('evaluateGamePositions supports parallel worker pool and reverse-order chunking', async t => {
  global.window = {};
  global.Worker = FakeWorker;
  const startIdx = FakeWorker.instances.length;
  const engine = new StockfishWorkerClient({ ready: 200, search: 200, stop: 200 }, 2);
  t.after(() => engine.terminate());

  const { fenList } = buildGamePositions('1. e4 e5 2. Nf3 Nc6');
  assert.equal(fenList.length, 5);

  FakeWorker.instances[startIdx].emit('readyok');
  const promise = engine.evaluateGamePositions(fenList, 16, 2);
  await tick();

  assert.equal(FakeWorker.instances.length - startIdx, 2);
  const w0 = FakeWorker.instances[startIdx];
  const w1 = FakeWorker.instances[startIdx + 1];

  w1.emit('readyok');
  await tick();
  w0.emit('readyok');
  w1.emit('readyok');
  await tick();

  const bestMoves = {
    [fenList[0]]: 'e2e4',
    [fenList[1]]: 'e7e5',
    [fenList[2]]: 'g1f3',
    [fenList[3]]: 'b8c6',
    [fenList[4]]: 'f1b5',
  };

  for (let step = 0; step < 10; step++) {
    await tick();
    for (const w of [w0, w1]) {
      const lastCmd = w.commands.at(-1) || '';
      if (lastCmd.startsWith('go depth')) {
        const posCmd = [...w.commands].reverse().find(c => c.startsWith('position fen '));
        const fen = posCmd.replace('position fen ', '');
        const bm = bestMoves[fen] || 'e2e4';
        w.emit(`info depth 16 multipv 1 score cp 20 pv ${bm}\nbestmove ${bm}`);
      }
    }
  }

  const results = await promise;
  assert.equal(results.length, 5);
  const w0Positions = w0.commands.filter(c => c.startsWith('position fen ')).map(c => c.replace('position fen ', ''));
  const w1Positions = w1.commands.filter(c => c.startsWith('position fen ')).map(c => c.replace('position fen ', ''));
  assert.deepEqual(w0Positions, [fenList[1], fenList[0]]);
  assert.deepEqual(w1Positions, [fenList[4], fenList[3], fenList[2]]);
});
