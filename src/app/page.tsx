'use client';

import React, { useState, useRef } from 'react';
import { Chess } from 'chess.js';
import {
  GameMetadata,
  GameReviewReport,
  MoveAnalysis,
} from '@/types/chess';
import {
  classifyMove,
  calculatePlayerAccuracy,
} from '@/lib/engine/classifier';
import { buildGamePositions } from '@/lib/engine/gamePositions';
import { getStockfishClient } from '@/lib/engine/workerClient';
import { generateHeuristicExplanation } from '@/lib/coachExplainer';
import {
  extractPuzzlesFromAnalysis,
  savePuzzlesToLocalStorage,
} from '@/lib/bridge/telegramExport';
import { lookupOpening } from '@/lib/openings';
import { useTranslation } from '@/lib/i18n/LanguageContext';

// UI Components
import { GameImporter } from '@/components/GameImporter';
import { ChessReviewBoard } from '@/components/ChessReviewBoard';
import { CoachBanner } from '@/components/CoachBanner';
import { ReviewSummary } from '@/components/ReviewSummary';
import { EvalGraph } from '@/components/EvalGraph';
import { MoveList } from '@/components/MoveList';
import { TelegramBridgeModal } from '@/components/TelegramBridgeModal';

import {
  RotateCcw,
  Loader2,
  Send,
  Activity,
  Globe,
} from 'lucide-react';

export default function HomePage() {
  const { t, locale, toggleLocale, dir, isRtl } = useTranslation();
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
  const analysisRunRef = useRef(0);
  const [analysisFailed, setAnalysisFailed] = useState(false);

  // Starts analysis of a loaded PGN
  const handleStartAnalysis = async (pgn: string, meta: GameMetadata) => {
    setCurrentPgn(pgn);
    setGameMetadata(meta);
    setGameState('analyzing');
    setAnalysisProgress(0);
    setCurrentPly(0);
    analysisAbortedRef.current = false;
    const analysisRun = ++analysisRunRef.current;
    setAnalysisFailed(false);

    // Set board orientation based on user or white
    if (meta.white.result === 'win' || meta.white.username.toLowerCase() === 'hikaru') {
      setBoardOrientation('white');
    }

    try {
      const { moveSteps, fenList } = buildGamePositions(pgn);
      setTotalPliesToAnalyze(moveSteps.length);
      meta = { ...meta, initialFen: fenList[0] };
      setGameMetadata(meta);

      const client = getStockfishClient();
      client.stopAndClearQueue();
      await client.waitReady();
      if (analysisRun !== analysisRunRef.current) return;

      const evalResults = await client.evaluateGamePositions(
        fenList,
        16, // depth
        3,  // MultiPV: compare the top three candidate moves
        (pct, cur) => {
          if (!analysisAbortedRef.current && analysisRun === analysisRunRef.current) {
            setAnalysisProgress(pct);
            setCurrentPlyAnalyzing(cur);
          }
        }
      );

      if (analysisAbortedRef.current || analysisRun !== analysisRunRef.current) return;

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

      // Only exact, legal opening positions qualify; never backfill unknown moves.
      let deepestOpeningName: string | undefined;
      const stepOpenings = moveSteps.map((step) => {
        const match = step.ply <= 24 ? lookupOpening(step.fenAfter) : null;
        if (match) deepestOpeningName = match.name;
        return match?.name;
      });

      if (!meta.opening && deepestOpeningName) {
        meta.opening = deepestOpeningName;
      }

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

        let bestUci =
          evalBeforeObj.bestMove ||
          evalBeforeObj.multiPVEvals?.[0]?.bestMove ||
          '';
        let bestSan = '';
        try {
          const probe = new Chess(step.fenBefore);
          if (bestUci && bestUci.length >= 4) {
            const m = probe.move({
              from: bestUci.slice(0, 2),
              to: bestUci.slice(2, 4),
              promotion: bestUci[4] || undefined,
            });
            if (m) bestSan = m.san;
          }
          if (!bestSan) {
            bestUci = step.uci;
            bestSan = step.san;
          }
        } catch {
          bestUci = bestUci || step.uci;
          bestSan = bestSan || step.san;
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
          bestMoveUci: bestUci,
          bestMoveSan: bestSan,
          pv: evalBeforeObj.pv?.length ? evalBeforeObj.pv : [bestUci],
          classification: classificationResult.classification,
          openingName: stepOpenings[i],
          pieceSacrificed: classificationResult.pieceSacrificed,
        };

        moveAnalysis.explanation = generateHeuristicExplanation(moveAnalysis, locale);
        analyzedMoves.push(moveAnalysis);

        const colorKey = step.turn === 'w' ? 'white' : 'black';
        classificationsCount[colorKey][classificationResult.classification] =
          (classificationsCount[colorKey][classificationResult.classification] || 0) + 1;
      }

      const whiteAccuracy = calculatePlayerAccuracy(analyzedMoves, 'w');
      const blackAccuracy = calculatePlayerAccuracy(analyzedMoves, 'b');

      const puzzles = extractPuzzlesFromAnalysis(analyzedMoves, meta);
      savePuzzlesToLocalStorage(puzzles);

      const report: GameReviewReport = {
        metadata: meta,
        moves: analyzedMoves,
        whiteAccuracy,
        blackAccuracy,
        classificationsCount,
        puzzles,
      };

      setReviewReport(report);
      setGameState('reviewed');
      setCurrentPly(1);
    } catch (err: any) {
      if (analysisAbortedRef.current || analysisRun !== analysisRunRef.current) return;
      console.error('Analysis failed:', err);
      setAnalysisFailed(true);
      setGameState('import');
    }
  };

  const currentMove =
    reviewReport && currentPly > 0 ? reviewReport.moves[currentPly - 1] : null;

  return (
    <div
      dir={dir}
      className={`min-h-screen flex flex-col bg-[#090c15] text-slate-100 ${
        isRtl ? 'font-sans' : 'font-sans'
      }`}
    >
      {/* Top Navbar */}
      <header className="border-b border-white/[0.08] bg-[#0c101c]/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-2.5 flex items-center justify-between">
        <button
          onClick={() => {
            analysisAbortedRef.current = true;
            analysisRunRef.current++;
            getStockfishClient().stopAndClearQueue();
            setGameState('import');
          }}
          className="flex items-center gap-3 group text-left transition-opacity hover:opacity-85 cursor-pointer focus:outline-none"
          title={t('brandName')}
          aria-label={t('brandName')}
        >
          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-white/[0.1] group-hover:border-emerald-500/50 flex items-center justify-center text-slate-200 transition-colors">
            <svg
              className="w-3.5 h-3.5 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M19 22H5v-2h14v2M17.5 13.5c-.7 0-1.3.4-1.6 1-.3-.6-.9-1-1.6-1-.5 0-1 .2-1.3.6C12.7 13.5 12.3 13 11.8 13c-.9 0-1.7.6-1.9 1.4-.4-.3-.9-.4-1.4-.4-1.4 0-2.5 1.1-2.5 2.5 0 .2 0 .4.1.6-.7.4-1.1 1.1-1.1 1.9h14c0-.8-.4-1.5-1.1-1.9.1-.2.1-.4.1-.6 0-1.4-1.1-2.5-2.5-2.5zM19 9c0-.6-.4-1-1-1h-1.1C16.4 6.8 14.8 6 13 6c-.4 0-.8 0-1.2.1-.6-1.2-1.8-2.1-3.3-2.1-2 0-3.6 1.4-3.9 3.3C4.2 7.7 4 8.3 4 9c0 1.2.6 2.3 1.5 3 .5.4 1.1.7 1.8.8.4-1 1.4-1.8 2.7-1.8.7 0 1.3.2 1.8.6.6-.9 1.6-1.6 2.7-1.6 1.1 0 2.1.6 2.7 1.6.4-.3 1-.5 1.5-.5.7 0 1.3.3 1.8.8.9-.7 1.5-1.8 1.5-3z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                {t('brandName')}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono text-slate-400 bg-slate-900 border border-white/[0.06]">
                <Activity className="w-2.5 h-2.5 text-emerald-400" />
                {t('engineBadge')}
              </span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <button
            onClick={toggleLocale}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-white/[0.08] transition-colors"
            title={t('language')}
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('toggleLang')}</span>
          </button>

          {gameState === 'reviewed' && (
            <button
              onClick={() => {
                analysisAbortedRef.current = true;
                analysisRunRef.current++;
                getStockfishClient().stopAndClearQueue();
                setGameState('import');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-white/[0.08] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('newAnalysis')}</span>
            </button>
          )}

          <a
            href="https://t.me/RewindChessBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-white/[0.08] transition-colors"
          >
            <Send className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">{t('telegramBot')}</span>
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-start">
        {analysisFailed && <p role="alert" className="mb-4 rounded-lg border border-red-400/40 p-3 text-sm text-red-200">{t('analysisFailed')}</p>}
        {/* 1. Import Mode */}
        {gameState === 'import' && (
          <div className="py-8 sm:py-14 space-y-6">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {t('heroTitle')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                {t('heroSubtitle')}
              </p>
            </div>

            <GameImporter onLoadGame={handleStartAnalysis} />
          </div>
        )}

        {/* 2. Analyzing Mode */}
        {gameState === 'analyzing' && (
          <div className="py-20 flex flex-col items-center justify-center space-y-5 max-w-md mx-auto text-center">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/[0.1] flex items-center justify-center text-slate-200">
              <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white">
                {t('analyzingTitle')}
              </h2>
              <p className="text-xs font-mono text-slate-400" dir="ltr">
                {t('evaluatingMove', { current: currentPlyAnalyzing, total: totalPliesToAnalyze })}
              </p>
            </div>

            <div className="w-full space-y-2">
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/[0.06]">
                <div
                  className="h-full bg-slate-200 rounded-full transition-all duration-200"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-mono" dir="ltr">
                <span>{t('multiPvInfo')}</span>
                <span className="font-semibold text-slate-300">{analysisProgress}%</span>
              </div>
            </div>

            <button
              onClick={() => {
                analysisAbortedRef.current = true;
                analysisRunRef.current++;
                getStockfishClient().stopAndClearQueue();
                setGameState('import');
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors pt-2"
            >
              {t('cancel')}
            </button>
          </div>
        )}

        {/* 3. Interactive Review Mode */}
        {gameState === 'reviewed' && reviewReport && (
          <div className="space-y-4">
            {/* Game Meta Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <span>{reviewReport.metadata.white.username}</span>
                  <span className="text-slate-500 font-normal">{t('vs')}</span>
                  <span>{reviewReport.metadata.black.username}</span>
                </div>
                {reviewReport.metadata.opening && (
                  <span className="hidden sm:inline px-2 py-0.5 rounded bg-slate-950 text-slate-400 font-mono text-[11px] truncate max-w-xs border border-white/[0.06]">
                    {reviewReport.metadata.opening}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-slate-400 text-xs font-mono">
                <span>
                  {t('result')} <strong className="text-white">{reviewReport.metadata.result}</strong>
                </span>
                {reviewReport.metadata.date && <span>• {reviewReport.metadata.date}</span>}
              </div>
            </div>

            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
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

                {/* Evaluation Graph */}
                <div className="w-full max-w-[540px] mt-3">
                  <EvalGraph
                    moves={reviewReport.moves}
                    currentPly={currentPly}
                    onSelectPly={setCurrentPly}
                  />
                </div>
              </div>

              {/* Right Column: Coach Banner, Tabs for Review Summary & Move List (lg:col-span-5) */}
              <div className="lg:col-span-5 space-y-3">
                <CoachBanner
                  currentMove={currentMove}
                  currentPly={currentPly}
                />

                <div className="bg-slate-900/60 border border-white/[0.08] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                    <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-slate-950 border border-white/[0.06]">
                      <button
                        onClick={() => setActiveRightTab('review')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          activeRightTab === 'review'
                            ? 'bg-slate-800 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t('tabSummary')}
                      </button>
                      <button
                        onClick={() => setActiveRightTab('moves')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          activeRightTab === 'moves'
                            ? 'bg-slate-800 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t('tabMoves')} ({reviewReport.moves.length})
                      </button>
                    </div>

                    <button
                      onClick={() => setIsTelegramModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      <Send className="w-3 h-3 text-slate-400" />
                      <span>{t('tabTelegram')}</span>
                    </button>
                  </div>

                  {activeRightTab === 'review' && (
                    <ReviewSummary
                      report={reviewReport}
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
