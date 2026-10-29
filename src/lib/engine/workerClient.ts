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
  private currentMultiPV: number = 2;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initWorker();
    }
  }

  private initWorker() {
    try {
      this.worker = new Worker('/engine/stockfish.js');
      this.worker.onmessage = (event: MessageEvent) => {
        const line = typeof event.data === 'string' ? event.data : '';
        this.handleUciLine(line);
      };

      this.worker.onerror = (err) => {
        console.error('Stockfish Worker error:', err);
      };

      // Send initial UCI handshake
      this.send('uci');
      this.send('setoption name Threads value 1');
      this.send('setoption name Hash value 32');
      this.send('setoption name MultiPV value 2');
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
      const bestMove = parts[1] || '';
      if (!this.currentEvalResult.bestMove && bestMove !== '(none)') {
        this.currentEvalResult.bestMove = bestMove;
      }

      if (this.currentTask) {
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
    // Ignore partial aspiration window fail-high / fail-low bound lines if we already have a full eval
    if (
      (line.includes('upperbound') || line.includes('lowerbound')) &&
      this.currentEvalResult.depth > 0
    ) {
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

    // Update main eval if multipv === 1
    if (multiPV === 1) {
      this.currentEvalResult.depth = depth;
      this.currentEvalResult.scoreCp = scoreCp;
      this.currentEvalResult.mate = mate;
      if (bestMove) {
        this.currentEvalResult.bestMove = bestMove;
      }
      this.currentEvalResult.pv = pvMoves;
    }

    // Track multiPV results
    if (!this.currentEvalResult.multiPVEvals) {
      this.currentEvalResult.multiPVEvals = [];
    }

    const existingPvIdx = this.currentEvalResult.multiPVEvals.findIndex((p) => p.pvIndex === multiPV);
    const pvData = {
      pvIndex: multiPV,
      scoreCp,
      mate,
      bestMove,
      pv: pvMoves,
    };

    if (existingPvIdx >= 0) {
      this.currentEvalResult.multiPVEvals[existingPvIdx] = pvData;
    } else {
      this.currentEvalResult.multiPVEvals.push(pvData);
    }
  }

  public async evaluatePosition(
    fen: string,
    depth: number = 14,
    multiPV: number = 2
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

  private processNextTask() {
    if (this.taskQueue.length === 0) {
      this.isProcessing = false;
      this.currentTask = null;
      return;
    }

    this.isProcessing = true;
    this.currentTask = this.taskQueue.shift()!;
    this.currentEvalResult = {
      depth: 0,
      scoreCp: 0,
      bestMove: '',
      pv: [],
      multiPVEvals: [],
    };

    if (this.currentTask.multiPV !== this.currentMultiPV) {
      this.currentMultiPV = this.currentTask.multiPV;
      this.send(`setoption name MultiPV value ${this.currentTask.multiPV}`);
    }
    this.send(`position fen ${this.currentTask.fen}`);
    this.send(`go depth ${this.currentTask.depth}`);
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
    multiPV: number = 2,
    onProgress?: EvalProgressCallback
  ): Promise<EngineEvalResult[]> {
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
