import { Chess } from 'chess.js';
import { EngineEvalResult } from '@/types/chess';
import { cpToWinPct } from '@/lib/engine/classifier';
import { lookupOpening } from '@/lib/openings';

export interface EvalProgressCallback {
  (progressPct: number, currentPly: number, totalPlies: number): void;
}

interface QueuedTask {
  fen: string;
  depth: number;
  multiPV: number;
  resolve: (result: EngineEvalResult) => void;
  reject: (err: Error) => void;
  isLive?: boolean;
  onPartial?: (result: EngineEvalResult) => void;
}

function playerWinPct(evaluation: { scoreCp?: number; mate?: number }, sign: number): number {
  if (evaluation.mate !== undefined) return evaluation.mate * sign > 0 ? 100 : 0;
  return cpToWinPct((evaluation.scoreCp ?? 0) * sign);
}

export class StockfishWorkerClient {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private readyResolvers: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
  private readyTimer?: ReturnType<typeof setTimeout>;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private failure: Error | null = null;
  private draining = false;
  private generation = 0;
  private currentTask: QueuedTask | null = null;
  private taskQueue: QueuedTask[] = [];
  private isProcessing: boolean = false;
  private currentEvalResult: EngineEvalResult = {
    depth: 0,
    scoreCp: 0,
    bestMove: '',
    pv: [],
    multiPVEvals: [],
  };
  private isTerminated: boolean = false;
  private currentMultiPV: number = 2;
  private poolWorkers: StockfishWorkerClient[] = [];

  constructor(
    private readonly timeouts = { ready: 30000, search: 120000, stop: 5000 },
    private readonly poolSize?: number
  ) {
    if (typeof window !== 'undefined') {
      this.initWorker();
    }
  }

  private initWorker() {
    try {
      this.worker = new Worker('/engine/stockfish.js#/engine/stockfish.wasm');
      this.worker.onmessage = (event: MessageEvent) => {
        const raw = typeof event.data === 'string' ? event.data : '';
        const lines = raw.split(/\r?\n/);
        for (const line of lines) {
          this.handleUciLine(line);
        }
      };

      this.worker.onerror = (err) => {
        this.fail(new Error(err.message || 'Stockfish worker failed'));
      };
      this.worker.onmessageerror = () => {
        this.fail(new Error('Invalid Stockfish worker response'));
      };

      // Send initial UCI handshake
      this.send('uci');
      this.send('setoption name Threads value 1');
      this.send('setoption name Hash value 64');
      this.send('setoption name MultiPV value 2');
      this.send('isready');
    } catch (e) {
      this.fail(e instanceof Error ? e : new Error('Stockfish could not start'));
    }
  }

  private send(cmd: string) {
    if (this.worker && !this.isTerminated) {
      try {
        this.worker.postMessage(cmd);
      } catch (error) {
        this.fail(error instanceof Error ? error : new Error('Stockfish communication failed'));
      }
    }
  }

  public get unavailable(): boolean {
    return this.isTerminated || this.failure !== null;
  }

  private fail(error: Error) {
    this.failure = error;
    this.isReady = false;
    clearTimeout(this.readyTimer);
    clearTimeout(this.searchTimer);
    this.readyResolvers.splice(0).forEach(waiter => waiter.reject(error));
    this.currentTask?.reject(error);
    this.currentTask = null;
    this.taskQueue.splice(0).forEach(task => task.reject(error));
    this.isProcessing = false;
    this.draining = false;
    this.worker?.terminate();
    this.worker = null;
    this.poolWorkers.splice(0).forEach(w => w.terminate());
  }

  public async waitReady(): Promise<void> {
    if (this.unavailable) throw this.failure ?? new Error('Analysis terminated');
    if (this.isReady) return;
    return new Promise<void>((resolve, reject) => {
      this.readyResolvers.push({ resolve, reject });
      if (!this.readyTimer) {
        this.readyTimer = setTimeout(() => this.fail(new Error('Stockfish startup timed out')), this.timeouts.ready);
      }
      this.send('isready');
    });
  }

  public async resetNewGame(): Promise<void> {
    await this.waitReady();
    if (this.unavailable) throw this.failure ?? new Error('Analysis terminated');
    this.send('ucinewgame');
    this.isReady = false;
    await this.waitReady();
  }

  private handleUciLine(line: string) {
    line = line.trim();
    if (!line || this.unavailable) return;

    if (line === 'readyok') {
      this.isReady = true;
      clearTimeout(this.readyTimer);
      this.readyTimer = undefined;
      while (this.readyResolvers.length > 0) {
        const r = this.readyResolvers.shift();
        r?.resolve();
      }
      return;
    }

    if (this.draining) {
      if (line.startsWith('bestmove')) {
        clearTimeout(this.searchTimer);
        this.draining = false;
        this.processNextTask();
      }
      return;
    }
    if (!this.currentTask) return;

    // Parse info depth ... score cp / mate ... multipv ... pv ...
    if (line.startsWith('info ') && line.includes('score ')) {
      this.parseInfoLine(line);
      return;
    }

    // Search finished for current position
    if (line.startsWith('bestmove')) {
      clearTimeout(this.searchTimer);
      const parts = line.split(/\s+/);
      const uciBestMove = parts[1] || '';

      // Prefer multipv 1's best move if present, otherwise use bestmove token
      const pv1Move = this.currentEvalResult.multiPVEvals?.find((p) => p.pvIndex === 1)?.bestMove;
      if (pv1Move) {
        this.currentEvalResult.bestMove = pv1Move;
      } else if (uciBestMove && uciBestMove !== '(none)') {
        this.currentEvalResult.bestMove = uciBestMove;
      }

      if (this.currentTask) {
        if (!this.currentEvalResult.bestMove || this.currentEvalResult.depth === 0) {
          this.fail(new Error('Stockfish returned no usable evaluation'));
          return;
        }

        // Sort multiPV evals by pvIndex
        if (this.currentEvalResult.multiPVEvals) {
          this.currentEvalResult.multiPVEvals.sort((a, b) => a.pvIndex - b.pvIndex);
        }
        const task = this.currentTask;
        this.currentTask = null;
        task.resolve({ ...this.currentEvalResult });
      }

      this.processNextTask();
    }
  }

  private parseInfoLine(line: string) {
    // Ignore partial aspiration window fail-high / fail-low bound lines
    const isBound = line.includes('upperbound') || line.includes('lowerbound');
    if (isBound) {
      return;
    }

    const tokens = line.split(/\s+/);

    let depth = 0;
    let scoreCp: number | undefined;
    let mate: number | undefined;
    let multiPV = 1;
    let pvIndex = -1;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === 'depth' && i + 1 < tokens.length) {
        depth = parseInt(tokens[i + 1], 10) || 0;
      } else if (tokens[i] === 'score') {
        if (i + 2 < tokens.length) {
          const type = tokens[i + 1];
          const val = parseInt(tokens[i + 2], 10);
          if (type === 'cp') {
            scoreCp = isNaN(val) ? 0 : val;
          } else if (type === 'mate') {
            mate = isNaN(val) ? 0 : val;
          }
        }
      } else if (tokens[i] === 'multipv' && i + 1 < tokens.length) {
        multiPV = parseInt(tokens[i + 1], 10) || 1;
      } else if (tokens[i] === 'pv') {
        pvIndex = i + 1;
        break;
      }
    }

    const pvMoves = pvIndex !== -1 ? tokens.slice(pvIndex) : [];
    const bestMove = pvMoves[0] || '';

    // Normalize Stockfish score to White's perspective
    // Stockfish UCI always reports score from the perspective of the side to move in currentTask.fen
    const fenTurn = (this.currentTask?.fen.split(' ')[1] || 'w') as 'w' | 'b';
    if (fenTurn === 'b') {
      if (scoreCp !== undefined) scoreCp = -scoreCp;
      if (mate !== undefined) mate = -mate;
    }

    // Convert mate to high centipawns for scoreCp so all downstream consumers have a numeric scale
    if (mate !== undefined && scoreCp === undefined) {
      scoreCp = (mate > 0 ? 1 : -1) * Math.max(1000, 10000 - Math.abs(mate) * 100);
    }

    // Update main eval if multipv === 1 and depth has progressed
    if (multiPV === 1 && depth >= this.currentEvalResult.depth) {
      this.currentEvalResult.depth = depth;
      if (scoreCp !== undefined) this.currentEvalResult.scoreCp = scoreCp;
      this.currentEvalResult.mate = mate;
      if (bestMove) {
        this.currentEvalResult.bestMove = bestMove;
      }
      if (pvMoves.length > 0) {
        this.currentEvalResult.pv = pvMoves;
      }
    }

    // Only record MultiPV lines that actually carry a move (or terminal depth 0)
    if (!bestMove && depth > 0) {
      return;
    }

    if (!this.currentEvalResult.multiPVEvals) {
      this.currentEvalResult.multiPVEvals = [];
    }

    const existingPvIdx = this.currentEvalResult.multiPVEvals.findIndex((p) => p.pvIndex === multiPV);
    if (existingPvIdx >= 0 && depth < (this.currentEvalResult.multiPVEvals[existingPvIdx].depth ?? 0)) return;
    const pvData = {
      depth,
      pvIndex: multiPV,
      scoreCp,
      mate,
      bestMove: bestMove || this.currentEvalResult.multiPVEvals[existingPvIdx]?.bestMove || '',
      pv: pvMoves.length > 0 ? pvMoves : (this.currentEvalResult.multiPVEvals[existingPvIdx]?.pv || []),
    };

    if (existingPvIdx >= 0) {
      this.currentEvalResult.multiPVEvals[existingPvIdx] = pvData;
    } else {
      this.currentEvalResult.multiPVEvals.push(pvData);
    }

    if (this.currentTask?.onPartial && (this.currentEvalResult.bestMove || this.currentEvalResult.scoreCp !== undefined)) {
      this.currentTask.onPartial({
        depth: this.currentEvalResult.depth,
        scoreCp: this.currentEvalResult.scoreCp,
        mate: this.currentEvalResult.mate,
        bestMove: this.currentEvalResult.bestMove,
        pv: [...this.currentEvalResult.pv],
        multiPVEvals: this.currentEvalResult.multiPVEvals ? [...this.currentEvalResult.multiPVEvals] : [],
      });
    }
  }

  public async evaluatePosition(
    fen: string,
    depth: number = 16,
    multiPV: number = 2
  ): Promise<EngineEvalResult> {
    const generation = this.generation;
    await this.waitReady();
    if (generation !== this.generation || this.unavailable) throw new Error('Evaluation cancelled');

    return new Promise<EngineEvalResult>((resolve, reject) => {
      this.taskQueue.push({
        fen,
        depth,
        multiPV,
        resolve,
        reject,
      });

      if (!this.isProcessing) {
        this.processNextTask();
      }
    });
  }

  /**
   * Fast, interactive evaluation designed for live variation board moves.
   * Cancels prior live queries and streams partial depth progress.
   */
  public async evaluateLivePosition(
    fen: string,
    depth: number = 14,
    multiPV: number = 2,
    onPartial?: (result: EngineEvalResult) => void
  ): Promise<EngineEvalResult> {
    const generation = this.generation;
    await this.waitReady();
    if (generation !== this.generation || this.unavailable) throw new Error('Evaluation cancelled');

    if (this.currentTask?.isLive) this.cancelCurrent();
    this.taskQueue = this.taskQueue.filter(task => {
      if (!task.isLive) return true;
      task.reject(new Error('Evaluation cancelled'));
      return false;
    });

    return new Promise<EngineEvalResult>((resolve, reject) => {
      const task: QueuedTask = {
        fen,
        depth,
        multiPV,
        resolve,
        reject,
        isLive: true,
        onPartial,
      };

      this.taskQueue.unshift(task);

      if (!this.isProcessing) {
        this.processNextTask();
      }
    });
  }

  private processNextTask() {
    if (this.unavailable || this.draining) return;
    if (this.taskQueue.length === 0) {
      this.isProcessing = false;
      this.currentTask = null;
      return;
    }

    this.isProcessing = true;
    const currentTask = this.taskQueue.shift()!;
    this.currentTask = currentTask;

    // Check if position is already terminal (checkmate / stalemate / draw) before querying engine
    try {
      const checkChess = new Chess(currentTask.fen);
      if (checkChess.isGameOver()) {
        const turn = checkChess.turn();
        const isMate = checkChess.isCheckmate();
        // If checkmated, the side to move lost (mate = 0 from side-to-move perspective)
        const whiteScoreCp = isMate ? (turn === 'w' ? -10000 : 10000) : 0;
        const whiteMate = isMate ? (turn === 'w' ? -1 : 1) : undefined;
        const terminalResult: EngineEvalResult = {
          depth: 0,
          scoreCp: whiteScoreCp,
          mate: whiteMate,
          bestMove: '',
          pv: [],
          multiPVEvals: [],
        };
        currentTask.onPartial?.(terminalResult);
        this.currentTask = null;
        currentTask.resolve(terminalResult);
        this.processNextTask();
        return;
      }
    } catch {
      currentTask.reject(new Error('Invalid analysis position'));
      this.currentTask = null;
      this.processNextTask();
      return;
    }

    this.currentEvalResult = {
      depth: 0,
      scoreCp: 0,
      bestMove: '',
      pv: [],
      multiPVEvals: [],
    };

    if (currentTask.multiPV !== this.currentMultiPV) {
      this.currentMultiPV = currentTask.multiPV;
      this.send(`setoption name MultiPV value ${currentTask.multiPV}`);
    }
    this.searchTimer = setTimeout(() => this.fail(new Error('Stockfish evaluation timed out')), this.timeouts.search);
    this.send(`position fen ${currentTask.fen}`);
    this.send(`go depth ${currentTask.depth}`);
  }

  private cancelCurrent() {
    if (!this.currentTask) return;
    this.currentTask.reject(new Error('Evaluation cancelled'));
    this.currentTask = null;
    this.draining = true;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.fail(new Error('Stockfish cancellation timed out')), this.timeouts.stop);
    // Do not launch another search until the stopped search's bestmove arrives.
    this.send('stop');
  }

  public stopAndClearQueue() {
    this.generation++;
    clearTimeout(this.readyTimer);
    this.readyTimer = undefined;
    this.readyResolvers.splice(0).forEach(waiter => waiter.reject(new Error('Evaluation cancelled')));
    this.taskQueue.splice(0).forEach(task => task.reject(new Error('Evaluation cancelled')));
    this.cancelCurrent();
    this.poolWorkers.forEach(w => w.stopAndClearQueue());
  }

  public terminate() {
    this.generation++;
    this.send('quit');
    this.isTerminated = true;
    this.fail(new Error('Analysis terminated'));
  }

  private resolvePoolSize(totalPositions: number): number {
    if (totalPositions < 4) return 1;
    if (this.poolSize !== undefined) {
      return Math.max(1, Math.min(this.poolSize, Math.floor(totalPositions / 2)));
    }
    if (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.hardwareConcurrency === 'number' &&
      typeof Worker !== 'undefined' &&
      !('instances' in Worker)
    ) {
      const cores = Math.min(4, Math.max(1, navigator.hardwareConcurrency));
      return Math.max(1, Math.min(cores, Math.floor(totalPositions / 4)));
    }
    return 1;
  }

  private getActivePool(targetCount: number): StockfishWorkerClient[] {
    this.poolWorkers = this.poolWorkers.filter(w => !w.unavailable);
    const neededHelpers = Math.max(0, targetCount - 1);
    while (this.poolWorkers.length < neededHelpers) {
      this.poolWorkers.push(new StockfishWorkerClient(this.timeouts, 1));
    }
    return [this, ...this.poolWorkers.slice(0, neededHelpers)];
  }

  /**
   * Evaluates all positions in a game using:
   * 1. A parallel Web Worker pool across CPU cores
   * 2. Reverse-order contiguous chunking so ply i+1 warms the 64MB transposition table for ply i
   * 3. Forced-move and terminal fast-paths (0ms derivation when only 1 legal move exists)
   * 4. Smart MultiPV skipping on terminal/final/book/losing top-move positions
   */
  public async evaluateGamePositions(
    fens: string[],
    depth: number = 16,
    multiPV: number = 2,
    onProgress?: EvalProgressCallback
  ): Promise<EngineEvalResult[]> {
    const total = fens.length;
    if (total === 0) return [];

    const generation = this.generation;
    await this.waitReady();
    if (generation !== this.generation || this.unavailable) throw new Error('Evaluation cancelled');

    // Pre-analyze position metadata once
    interface PositionMeta {
      turn: 'w' | 'b';
      isTerminal: boolean;
      legalMovesCount: number;
      onlyMoveUci?: string;
      playedUci?: string;
      isBookNext: boolean;
    }

    const meta: PositionMeta[] = new Array(total);
    for (let i = 0; i < total; i++) {
      let board: Chess;
      try {
        board = new Chess(fens[i]);
      } catch {
        throw new Error('Invalid analysis position');
      }
      const turn = board.turn();
      const isTerminal = board.isGameOver();
      if (isTerminal) {
        meta[i] = {
          turn,
          isTerminal: true,
          legalMovesCount: 0,
          isBookNext: false,
        };
        continue;
      }

      const moves = board.moves({ verbose: true });
      const nextFen = i + 1 < total ? fens[i + 1] : undefined;
      const nextKey = nextFen ? nextFen.split(' ').slice(0, 4).join(' ') : undefined;
      const playedMove = nextKey
        ? moves.find(m => m.after.split(' ').slice(0, 4).join(' ') === nextKey)
        : undefined;

      meta[i] = {
        turn,
        isTerminal: false,
        legalMovesCount: moves.length,
        onlyMoveUci: moves.length === 1 ? moves[0].lan : undefined,
        playedUci: playedMove?.lan,
        isBookNext: Boolean(nextFen && i < 24 && lookupOpening(nextFen)),
      };
    }

    const workers = this.getActivePool(this.resolvePoolSize(total));
    await Promise.all(workers.map(w => w.resetNewGame()));
    if (generation !== this.generation || this.unavailable) throw new Error('Evaluation cancelled');

    const results: EngineEvalResult[] = new Array(total);
    let completed = 0;
    const reportProgress = () => {
      completed++;
      if (onProgress && generation === this.generation && !this.unavailable) {
        const pct = Math.round((completed / total) * 100);
        onProgress(pct, completed, total);
      }
    };

    const workerCount = workers.length;
    const chunkTasks = workers.map(async (worker, workerIdx) => {
      const chunkStart = Math.floor((workerIdx * total) / workerCount);
      const chunkEnd = Math.floor(((workerIdx + 1) * total) / workerCount);

      // Evaluate backward (chunkEnd - 1 -> chunkStart) so fens[i + 1] populates the
      // worker's transposition table at depth N before fens[i] is searched.
      for (let i = chunkEnd - 1; i >= chunkStart; i--) {
        if (this.unavailable || worker.unavailable || generation !== this.generation) {
          throw new Error('Analysis terminated');
        }

        const posMeta = meta[i];
        const sign = posMeta.turn === 'w' ? 1 : -1;

        // 1. Terminal position fast-path
        if (posMeta.isTerminal) {
          results[i] = await worker.evaluatePosition(fens[i], depth, 1);
          reportProgress();
          continue;
        }

        // 2. Final game position: only ever used as evalAfterObj, never needs MultiPV > 1
        if (i === total - 1) {
          results[i] = await worker.evaluatePosition(fens[i], depth, 1);
          reportProgress();
          continue;
        }

        const afterRes = results[i + 1];

        // 3. Forced move fast-path (only 1 legal move in position)
        if (posMeta.legalMovesCount === 1 && posMeta.onlyMoveUci) {
          if (
            afterRes &&
            posMeta.playedUci === posMeta.onlyMoveUci &&
            (afterRes.mate === undefined || afterRes.depth === 0)
          ) {
            const onlyUci = posMeta.onlyMoveUci;
            const derivedDepth = Math.max(1, afterRes.depth);
            const pv = [onlyUci, ...(afterRes.pv || [])];
            results[i] = {
              depth: derivedDepth,
              scoreCp: afterRes.scoreCp,
              mate: afterRes.mate,
              bestMove: onlyUci,
              pv,
              multiPVEvals: [
                {
                  depth: derivedDepth,
                  pvIndex: 1,
                  scoreCp: afterRes.scoreCp,
                  mate: afterRes.mate,
                  bestMove: onlyUci,
                  pv,
                },
              ],
            };
          } else {
            results[i] = await worker.evaluatePosition(fens[i], depth, 1);
          }
          reportProgress();
          continue;
        }

        const targetMultiPV = Math.min(multiPV, posMeta.legalMovesCount);
        if (targetMultiPV <= 1) {
          results[i] = await worker.evaluatePosition(fens[i], depth, 1);
          reportProgress();
          continue;
        }

        // 4. Smart MultiPV: if the move enters a known book position or the position after
        // the move is < 50% win chance for the moving player, a single-PV search suffices
        // whenever the played move is already the top engine choice or loses no win%.
        const rawAfter = afterRes
          ? meta[i + 1]?.isTerminal
            ? afterRes.mate !== undefined
              ? 100
              : 50
            : playerWinPct(afterRes, sign)
          : undefined;

        const preferSinglePVFirst =
          posMeta.isBookNext || (rawAfter !== undefined && rawAfter < 50);

        if (preferSinglePVFirst && afterRes && rawAfter !== undefined) {
          const res1 = await worker.evaluatePosition(fens[i], depth, 1);
          if (this.unavailable || worker.unavailable || generation !== this.generation) {
            throw new Error('Analysis terminated');
          }
          const winPctBefore = playerWinPct(res1, sign);
          const sameMateStatus = Math.sign(res1.mate ?? 0) === Math.sign(afterRes.mate ?? 0);
          const canCorrect = !meta[i + 1]?.isTerminal && sameMateStatus;
          const isTopChoice = Boolean(posMeta.playedUci && res1.bestMove === posMeta.playedUci);
          const effectiveAfter =
            canCorrect && isTopChoice ? Math.max(winPctBefore, rawAfter) : rawAfter;
          const noLoss = effectiveAfter >= winPctBefore;
          const cannotBeBrilliantOrGreat = posMeta.isBookNext || effectiveAfter < 50;

          if ((isTopChoice || noLoss) && cannotBeBrilliantOrGreat) {
            results[i] = res1;
            reportProgress();
            continue;
          }

          // Otherwise run warm-TT MultiPV search to populate candidate lines
          results[i] = await worker.evaluatePosition(fens[i], depth, targetMultiPV);
          reportProgress();
          continue;
        }

        results[i] = await worker.evaluatePosition(fens[i], depth, targetMultiPV);
        reportProgress();
      }
    });

    await Promise.all(workerTasksWithCleanup(chunkTasks, () => this.stopAndClearQueue()));
    return results;
  }
}

function workerTasksWithCleanup<T>(
  tasks: Promise<T>[],
  onError: () => void
): Promise<T>[] {
  let failed = false;
  return tasks.map(p =>
    p.catch(err => {
      if (!failed) {
        failed = true;
        onError();
      }
      throw err;
    })
  );
}

// Singleton helper for browser usage
let clientInstance: StockfishWorkerClient | null = null;

export function getStockfishClient(): StockfishWorkerClient {
  if (!clientInstance || clientInstance.unavailable) {
    clientInstance = new StockfishWorkerClient();
  }
  return clientInstance;
}
