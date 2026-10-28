'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import {
  GameMetadata,
  GameReviewReport,
  MoveAnalysis,
  MoveClassification,
  RewindPuzzlePayload,
} from '@/types/chess';
import {
  classifyMove,
  calculatePlayerAccuracy,
  estimateEloFromAccuracy,
} from '@/lib/engine/classifier';
import { getStockfishClient } from '@/lib/engine/workerClient';
import { generateHeuristicExplanation } from '@/lib/coachExplainer';
import {
  extractPuzzlesFromAnalysis,
  savePuzzlesToLocalStorage,
} from '@/lib/bridge/telegramExport';
import { lookupOpening } from '@/lib/openings';

// UI Components
import { GameImporter, SAMPLE_GAMES } from '@/components/GameImporter';
import { ChessReviewBoard } from '@/components/ChessReviewBoard';
import { CoachBanner } from '@/components/CoachBanner';
import { ReviewSummary } from '@/components/ReviewSummary';
import { EvalGraph } from '@/components/EvalGraph';
import { MoveList } from '@/components/MoveList';
import { TelegramBridgeModal } from '@/components/TelegramBridgeModal';

import {
  ShieldCheck,
  Cpu,
  RotateCcw,
  Sparkles,
  Swords,
  Loader2,
  Bot,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  const [gameState, setGameState] = useState<'import' | 'analyzing' | 'reviewed'>('import');
  const [currentPgn, setCurrentPgn] = useState<string | null>(null);
  const [gameMetadata, setGameMetadata] = useState<GameMetadata | null>(null);

  // Analysis progress
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentPlyAnalyzing, setCurrentPlyAnalyzing] = useState(0);
  const [totalPliesToAnalyze, setTotalPliesToAnalyze] = useState(0);

  // Review report
  const [reviewReport, setReviewReport] = useState<GameReviewReport | null>(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');

  // Modals & Panels
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'review' | 'moves'>('review');

  const analysisAbortedRef = useRef(false);

  // Starts analysis of a loaded PGN
  const handleStartAnalysis = async (pgn: string, meta: GameMetadata) => {
    setCurrentPgn(pgn);
    setGameMetadata(meta);
    setGameState('analyzing');
    setAnalysisProgress(0);
    setCurrentPly(0);
    analysisAbortedRef.current = false;

    // Set board orientation based on user or white
    if (meta.white.result === 'win' || meta.white.username.toLowerCase() === 'hikaru') {
      setBoardOrientation('white');
    }

    try {
      const chess = new Chess();
      chess.loadPgn(pgn);

      // Collect move history
      const history = chess.history({ verbose: true });
      const totalPlies = history.length;
      setTotalPliesToAnalyze(totalPlies);

      if (totalPlies === 0) {
        throw new Error('No moves found in PGN.');
      }

      // Reconstruct FEN before and after for each move
      const replayChess = new Chess();
      const fenList: string[] = [replayChess.fen()];
      const moveSteps: Array<{
        ply: number;
        moveNumber: number;
        turn: 'w' | 'b';
        san: string;
        uci: string;
        from: string;
        to: string;
        fenBefore: string;
        fenAfter: string;
      }> = [];

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
          uci: `${h.from}${h.to}${h.promotion || ''}`,
          from: h.from,
          to: h.to,
          fenBefore,
          fenAfter,
        });
      }

      // Run client-side Stockfish evaluation queue
      const client = getStockfishClient();
      await client.waitReady();

      const evalResults = await client.evaluateGamePositions(
        fenList,
        14, // depth
        2,  // multiPV
        (pct, cur, tot) => {
          if (!analysisAbortedRef.current) {
            setAnalysisProgress(pct);
            setCurrentPlyAnalyzing(cur);
          }
        }
      );

      if (analysisAbortedRef.current) return;

      // Classify all moves
      const analyzedMoves: MoveAnalysis[] = [];
      const classificationsCount = {
        white: {
          brilliant: 0,
          great: 0,
          best: 0,
          excellent: 0,
          good: 0,
          book: 0,
          inaccuracy: 0,
          mistake: 0,
          blunder: 0,
          missed_win: 0,
        },
        black: {
          brilliant: 0,
          great: 0,
          best: 0,
          excellent: 0,
          good: 0,
          book: 0,
          inaccuracy: 0,
          mistake: 0,
          blunder: 0,
          missed_win: 0,
        },
      };

      for (let i = 0; i < moveSteps.length; i++) {
        const step = moveSteps[i];
        const evalBeforeObj = evalResults[i];
        const evalAfterObj = evalResults[i + 1];
        const prevMoveAnalysis = i > 0 ? analyzedMoves[i - 1] : undefined;

        const classificationResult = classifyMove({
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
        });

        // Determine opening name if book move
        const openingMatch = lookupOpening(step.fenAfter);

        // Convert best move UCI to SAN using chess.js
        let bestSan = evalBeforeObj.bestMove || '';
        try {
          if (evalBeforeObj.bestMove && evalBeforeObj.bestMove.length >= 4) {
            const probe = new Chess(step.fenBefore);
            const m = probe.move({
              from: evalBeforeObj.bestMove.slice(0, 2),
              to: evalBeforeObj.bestMove.slice(2, 4),
              promotion: evalBeforeObj.bestMove[4] || undefined,
            });
            if (m) bestSan = m.san;
          }
        } catch {
          // Fallback
        }

        const moveAnalysis: MoveAnalysis = {
          ply: step.ply,
          moveNumber: step.moveNumber,
          turn: step.turn,
          san: step.san,
          uci: step.uci,
          from: step.from,
          to: step.to,
          fenBefore: step.fenBefore,
          fenAfter: step.fenAfter,
          evalBefore: classificationResult.evalBeforeWhite,
          evalAfter: classificationResult.evalAfterWhite,
          isMateBefore: evalBeforeObj.mate !== undefined,
          mateBefore: evalBeforeObj.mate,
          isMateAfter: evalAfterObj.mate !== undefined,
          mateAfter: evalAfterObj.mate,
          winPctBefore: classificationResult.winPctBefore,
          winPctAfter: classificationResult.winPctAfter,
          winPctLoss: classificationResult.winPctLoss,
          bestMoveUci: evalBeforeObj.bestMove || '',
          bestMoveSan: bestSan || evalBeforeObj.bestMove || '',
          pv: evalBeforeObj.pv || [],
          classification: classificationResult.classification,
          openingName: openingMatch?.name,
          pieceSacrificed: classificationResult.pieceSacrificed,
        };

        // Generate heuristic tactical explanation
        moveAnalysis.explanation = generateHeuristicExplanation(moveAnalysis);
        analyzedMoves.push(moveAnalysis);

        // Increment counts
        const colorKey = step.turn === 'w' ? 'white' : 'black';
        classificationsCount[colorKey][classificationResult.classification] =
          (classificationsCount[colorKey][classificationResult.classification] || 0) + 1;
      }

      // Compute player overall accuracies & estimated Elos
      const whiteAccuracy = calculatePlayerAccuracy(analyzedMoves, 'w');
      const blackAccuracy = calculatePlayerAccuracy(analyzedMoves, 'b');
      const whiteEstimatedElo = estimateEloFromAccuracy(whiteAccuracy);
      const blackEstimatedElo = estimateEloFromAccuracy(blackAccuracy);

      // Extract puzzles for companion Telegram Bot & persist in localStorage
      const puzzles = extractPuzzlesFromAnalysis(analyzedMoves, meta);
      savePuzzlesToLocalStorage(puzzles);

      const report: GameReviewReport = {
        metadata: meta,
        moves: analyzedMoves,
        whiteAccuracy,
        blackAccuracy,
        whiteEstimatedElo,
        blackEstimatedElo,
        classificationsCount,
        puzzles,
      };

      setReviewReport(report);
      setGameState('reviewed');
      setCurrentPly(1); // Jump to move 1
    } catch (err: any) {
      console.error('Analysis failed:', err);
      alert(err.message || 'Game analysis failed.');
      setGameState('import');
    }
  };

  // Jump to first blunder or mistake for Retry mode
  const handleRetryMistakes = () => {
    if (!reviewReport) return;
    const firstMistake = reviewReport.moves.find((m) =>
      ['blunder', 'mistake', 'missed_win'].includes(m.classification)
    );
    if (firstMistake) {
      setCurrentPly(firstMistake.ply);
      setActiveRightTab('review');
    }
  };

  const currentMove =
    reviewReport && currentPly > 0 ? reviewReport.moves[currentPly - 1] : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-black text-lg">
            ♞
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                Rewind<span className="text-sky-400">Board</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Cpu className="w-3 h-3" />
                Stockfish 19 WASM
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Zero-Ad Client-Side Chess Game Review & Tactical Coach
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {gameState === 'reviewed' && (
            <button
              onClick={() => {
                analysisAbortedRef.current = true;
                setGameState('import');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Import Another Game</span>
            </button>
          )}

          <a
            href="https://t.me/RewindChessBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Telegram Bot</span>
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-start">
        {/* 1. Import Mode */}
        {gameState === 'import' && (
          <div className="py-6 sm:py-12 space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>100% Free • No Subscription • Client-Side WASM</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Chess Game Review, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-indigo-400">
                  Powered by Stockfish 19
                </span>
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Fetch games by Chess.com Username, Game URL, Lichess URL, or raw PGN.
                Get instant Chess.com-style accuracy, brilliant moves, blunder alerts, and export
                mistakes directly to Telegram.
              </p>
            </div>

            <GameImporter onLoadGame={handleStartAnalysis} />
          </div>
        )}

        {/* 2. Analyzing Mode */}
        {gameState === 'analyzing' && (
          <div className="py-16 flex flex-col items-center justify-center space-y-6 max-w-lg mx-auto text-center animate-in fade-in duration-300">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-xl shadow-sky-500/20 animate-pulse">
                <Cpu className="w-10 h-10 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">
                Stockfish 19 Reviewing Positions...
              </h3>
              <p className="text-xs text-slate-400">
                Evaluating position {currentPlyAnalyzing} of {totalPliesToAnalyze} plies in WebAssembly
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-2">
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-200"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>MultiPV: 2 • Depth: 14</span>
                <span className="font-bold text-sky-400">{analysisProgress}%</span>
              </div>
            </div>

            <button
              onClick={() => {
                analysisAbortedRef.current = true;
                setGameState('import');
              }}
              className="text-xs text-slate-500 hover:text-slate-300 underline pt-2"
            >
              Cancel Analysis
            </button>
          </div>
        )}

        {/* 3. Interactive Review Mode */}
        {gameState === 'reviewed' && reviewReport && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Game Meta Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                  <span>{reviewReport.metadata.white.username}</span>
                  <span className="text-slate-500 font-normal">vs</span>
                  <span>{reviewReport.metadata.black.username}</span>
                </div>
                {reviewReport.metadata.opening && (
                  <span className="hidden sm:inline px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px] truncate max-w-xs">
                    {reviewReport.metadata.opening}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-slate-400">
                <span>Result: <strong className="text-white">{reviewReport.metadata.result}</strong></span>
                {reviewReport.metadata.date && <span>• {reviewReport.metadata.date}</span>}
              </div>
            </div>

            {/* 3-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left / Center: Interactive Board & Controls (lg:col-span-7) */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <ChessReviewBoard
                  moves={reviewReport.moves}
                  currentPly={currentPly}
                  onSelectPly={setCurrentPly}
                  orientation={boardOrientation}
                  onToggleOrientation={() =>
                    setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'))
                  }
                  className="w-full"
                />

                {/* Evaluation Graph underneath Board */}
                <div className="w-full max-w-[540px] mt-4">
                  <EvalGraph
                    moves={reviewReport.moves}
                    currentPly={currentPly}
                    onSelectPly={setCurrentPly}
                  />
                </div>
              </div>

              {/* Right Column: Coach Banner, Tabs for Review Summary & Move List (lg:col-span-5) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Coach Banner at top */}
                <CoachBanner
                  currentMove={currentMove}
                  currentPly={currentPly}
                />

                {/* Right Column Tabs: Review Summary vs. Move List */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveRightTab('review')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeRightTab === 'review'
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Accuracy & Breakdown
                      </button>
                      <button
                        onClick={() => setActiveRightTab('moves')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeRightTab === 'moves'
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Move List ({reviewReport.moves.length})
                      </button>
                    </div>

                    <button
                      onClick={() => setIsTelegramModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Telegram Sync</span>
                    </button>
                  </div>

                  {activeRightTab === 'review' && (
                    <ReviewSummary
                      report={reviewReport}
                      onRetryMistakes={handleRetryMistakes}
                      onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
                      onRestartReview={() => setCurrentPly(1)}
                    />
                  )}

                  {activeRightTab === 'moves' && (
                    <MoveList
                      moves={reviewReport.moves}
                      currentPly={currentPly}
                      onSelectPly={setCurrentPly}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Telegram Bridge Modal */}
      {reviewReport && (
        <TelegramBridgeModal
          isOpen={isTelegramModalOpen}
          onClose={() => setIsTelegramModalOpen(false)}
          puzzles={reviewReport.puzzles}
          whitePlayer={reviewReport.metadata.white.username}
          blackPlayer={reviewReport.metadata.black.username}
        />
      )}
    </div>
  );
}
