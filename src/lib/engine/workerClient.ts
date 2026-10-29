import { Chess } from 'chess.js';
import { EngineEvalResult } from '@/types/chess';

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

export class StockfishWorkerClient {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private readyResolvers: Array<() => void> = [];
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
  private currentMultiPV: number = 3;

  constructor() {
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
        console.error('Stockfish Worker error:', err);
      };

      // Send initial UCI handshake
      this.send('uci');
      this.send('setoption name Threads value 1');
      this.send('setoption name Hash value 32');
      this.send('setoption name MultiPV value 3');
      this.send('isready');
    } catch (e) {
      console.error('Failed to instantiate Stockfish worker:', e);
    }
  }

  private send(cmd: string) {
    if (this.worker && !this.isTerminated) {
      this.worker.postMessage(cmd);
    }
  }

  public async waitReady(): Promise<void> {
    if (this.isReady) return;
    return new Promise<void>((resolve) => {
      this.readyResolvers.push(resolve);
      this.send('isready');
    });
  }

  private handleUciLine(line: string) {
    line = line.trim();
    if (!line) return;

    if (line === 'readyok') {
      this.isReady = true;
      while (this.readyResolvers.length > 0) {
        const r = this.readyResolvers.shift();
        r?.();
      }
      return;
    }

    // Parse info depth ... score cp / mate ... multipv ... pv ...
    if (line.startsWith('info ') && line.includes('score ')) {
      this.parseInfoLine(line);
      return;
    }

    // Search finished for current position
    if (line.startsWith('bestmove')) {
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
        // Fallback: if bestMove is still empty on a non-terminal position, pick the first legal move
        if (!this.currentEvalResult.bestMove) {
          try {
            const chess = new Chess(this.currentTask.fen);
            const legalMoves = chess.moves({ verbose: true });
            if (legalMoves.length > 0) {
              const first = legalMoves[0];
              const fallbackUci = `${first.from}${first.to}${first.promotion || ''}`;
              this.currentEvalResult.bestMove = fallbackUci;
              if (this.currentEvalResult.pv.length === 0) {
                this.currentEvalResult.pv = [fallbackUci];
              }
            }
          } catch {
            // Terminal or invalid FEN
          }
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
    if (isBound && this.currentEvalResult.depth > 0) {
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
      scoreCp = mate > 0 ? (10000 - Math.abs(mate) * 100) : (-10000 + Math.abs(mate) * 100);
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
    const pvData = {
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
    depth: number = 14,
    multiPV: number = 3
  ): Promise<EngineEvalResult> {
    await this.waitReady();

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
    multiPV: number = 3,
    onPartial?: (result: EngineEvalResult) => void
  ): Promise<EngineEvalResult> {
    await this.waitReady();

    // Cancel existing live task if in progress
    if (this.currentTask?.isLive) {
      this.send('stop');
      this.currentTask = null;
    }
    // Remove stale live tasks
    this.taskQueue = this.taskQueue.filter((t) => !t.isLive);

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
      // Proceed to engine if FEN check fails
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
    this.send(`position fen ${currentTask.fen}`);
    this.send(`go depth ${currentTask.depth}`);
  }

  public stopAndClearQueue() {
    this.taskQueue.forEach((task) => {
      task.reject(new Error('Evaluation cancelled'));
    });
    this.taskQueue = [];
    this.currentTask = null;
    this.isProcessing = false;
    this.send('stop');
  }

  public terminate() {
    this.isTerminated = true;
    this.stopAndClearQueue();
    if (this.worker) {
      this.send('quit');
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Evaluates all positions in a game sequentially with live progress streaming
   */
  public async evaluateGamePositions(
    fens: string[],
    depth: number = 14,
    multiPV: number = 3,
    onProgress?: EvalProgressCallback
  ): Promise<EngineEvalResult[]> {
    // Reset engine hash table for clean deterministic evaluation of the game
    this.send('ucinewgame');
    this.isReady = false;
    await this.waitReady();

    const results: EngineEvalResult[] = [];
    const total = fens.length;

    for (let i = 0; i < total; i++) {
      if (this.isTerminated) {
        throw new Error('Analysis terminated');
      }

      const fen = fens[i];
      const result = await this.evaluatePosition(fen, depth, multiPV);
      results.push(result);

      if (onProgress) {
        const pct = Math.round(((i + 1) / total) * 100);
        onProgress(pct, i + 1, total);
      }
    }

    return results;
  }
}

// Singleton helper for browser usage
let clientInstance: StockfishWorkerClient | null = null;

export function getStockfishClient(): StockfishWorkerClient {
  if (!clientInstance) {
    clientInstance = new StockfishWorkerClient();
  }
  return clientInstance;
}
