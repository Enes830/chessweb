'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import {
  GameMetadata,
  GameReviewReport,
  MoveAnalysis,
  RecentGameItem,
  ChessComProfile,
  ChessComStats,
} from '@/types/chess';
import {
  fetchChessComUserProfile,
  fetchChessComUserStats,
  fetchChessComUserGames,
  parsePgnToMetadata,
  detectInputType,
} from '@/lib/chesscom';
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
import { useTranslation } from '@/lib/i18n/LanguageContext';

// UI Components
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
  Copy,
  Check,
  Clock,
  ArrowLeft,
  Search,
  Zap,
  Flame,
  Calendar,
  AlertCircle,
  ExternalLink,
  User,
  ArrowRight,
} from 'lucide-react';

const RESERVED_SLUGS = [
  'api',
  'engine',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  '_next',
  'images',
  'icons',
];

interface PageProps {
  params: Promise<{ username: string }>;
}

export default function UserProfilePage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const rawUsername = decodeURIComponent(resolvedParams.username || '').replace(/^@/, '').trim();

  const router = useRouter();
  const { t, locale, toggleLocale, dir, isRtl } = useTranslation();

  // Route safeguard
  const isReserved = RESERVED_SLUGS.includes(rawUsername.toLowerCase());

  // Page States: 'profile' | 'analyzing' | 'reviewed'
  const [pageState, setPageState] = useState<'profile' | 'analyzing' | 'reviewed'>('profile');

  // Player Data
  const [profile, setProfile] = useState<ChessComProfile | null>(null);
  const [stats, setStats] = useState<ChessComStats | null>(null);
  const [games, setGames] = useState<RecentGameItem[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Time-control filter
  const [selectedTimeClass, setSelectedTimeClass] = useState<string>('all');

  // Copy URL state
  const [copiedLink, setCopiedLink] = useState(false);

  // Quick search input in navbar
  const [quickSearchInput, setQuickSearchInput] = useState('');

  // Analysis State
  const [currentPgn, setCurrentPgn] = useState<string | null>(null);
  const [gameMetadata, setGameMetadata] = useState<GameMetadata | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentPlyAnalyzing, setCurrentPlyAnalyzing] = useState(0);
  const [totalPliesToAnalyze, setTotalPliesToAnalyze] = useState(0);

  // Review Report
  const [reviewReport, setReviewReport] = useState<GameReviewReport | null>(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'review' | 'moves'>('review');

  const analysisAbortedRef = useRef(false);

  // Fetch Player Profile, Stats & Games on Mount or username change
  useEffect(() => {
    if (!rawUsername || isReserved) return;

    let isMounted = true;
    setIsLoadingProfile(true);
    setErrorMessage(null);
    setPageState('profile');

    Promise.all([
      fetchChessComUserProfile(rawUsername).catch(() => null),
      fetchChessComUserStats(rawUsername).catch(() => null),
      fetchChessComUserGames(rawUsername),
    ])
      .then(([profData, statsData, gamesData]) => {
        if (!isMounted) return;
        if (!profData && gamesData.length === 0) {
          throw new Error(t('playerNotFoundDesc', { username: rawUsername }));
        }
        setProfile(
          profData || {
            username: rawUsername,
          }
        );
        setStats(statsData || {});
        setGames(gamesData);
        setIsLoadingProfile(false);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setErrorMessage(err.message || 'Failed to load player data.');
        setIsLoadingProfile(false);
      });

    return () => {
      isMounted = false;
    };
  }, [rawUsername, isReserved, t]);

  // Handle Copy Profile Link
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Handle Quick Search in navbar
  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = quickSearchInput.trim();
    if (!query) return;

    const { type, parsedValue } = detectInputType(query);
    if (type === 'chesscom_user') {
      router.push(`/${parsedValue}`);
      setQuickSearchInput('');
    } else {
      router.push(`/?search=${encodeURIComponent(query)}`);
    }
  };

  // Start analysis of a selected game
  const handleStartAnalysis = async (pgn: string, meta: GameMetadata) => {
    setCurrentPgn(pgn);
    setGameMetadata(meta);
    setPageState('analyzing');
    setAnalysisProgress(0);
    setCurrentPly(0);
    analysisAbortedRef.current = false;

    // Set board orientation based on player
    if (meta.white.username.toLowerCase() === rawUsername.toLowerCase()) {
      setBoardOrientation('white');
    } else if (meta.black.username.toLowerCase() === rawUsername.toLowerCase()) {
      setBoardOrientation('black');
    } else {
      setBoardOrientation('white');
    }

    try {
      const chess = new Chess();
      chess.loadPgn(pgn);

      const history = chess.history({ verbose: true });
      const totalPlies = history.length;
      setTotalPliesToAnalyze(totalPlies);

      if (totalPlies === 0) {
        throw new Error('No moves found in PGN.');
      }

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

      const client = getStockfishClient();
      await client.waitReady();

      const evalResults = await client.evaluateGamePositions(
        fenList,
        16,
        3,
        (pct, cur) => {
          if (!analysisAbortedRef.current) {
            setAnalysisProgress(pct);
            setCurrentPlyAnalyzing(cur);
          }
        }
      );

      if (analysisAbortedRef.current) return;

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

      let inBookSequence = true;
      let deepestOpeningName: string | undefined;
      const stepOpenings: Array<string | undefined> = new Array(moveSteps.length);
      const isBookMoveStep: boolean[] = new Array(moveSteps.length).fill(false);

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

      if (deepestOpeningName) {
        let currentName: string = stepOpenings[0] || deepestOpeningName!;
        for (let i = 0; i < moveSteps.length; i++) {
          if (stepOpenings[i]) {
            currentName = stepOpenings[i]!;
          } else if (i <= 16) {
            stepOpenings[i] = currentName;
          }
        }
      }

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
          forceBook: isBookMoveStep[i],
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
      const whiteEstimatedElo = estimateEloFromAccuracy(whiteAccuracy, analyzedMoves, 'w');
      const blackEstimatedElo = estimateEloFromAccuracy(blackAccuracy, analyzedMoves, 'b');

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
      setPageState('reviewed');
      setCurrentPly(1);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      alert(err.message || 'Game analysis failed.');
      setPageState('profile');
    }
  };

  if (isReserved) {
    return null;
  }

  // Filter games based on timeClass
  const filteredGames = games.filter((g) => {
    if (selectedTimeClass === 'all') return true;
    if (!g.timeClass) return true;
    return g.timeClass.toLowerCase() === selectedTimeClass.toLowerCase();
  });

  const currentMove =
    reviewReport && currentPly > 0 ? reviewReport.moves[currentPly - 1] : null;

  return (
    <div
      dir={dir}
      className={`min-h-screen flex flex-col bg-[#090c15] text-slate-100 ${
        isRtl ? 'font-sans' : 'font-sans'
      }`}
    >
      {/* Top Navbar with Clickable Logo */}
      <header className="border-b border-white/[0.08] bg-[#0c101c]/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 group transition-opacity hover:opacity-85 cursor-pointer shrink-0"
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
        </Link>

        {/* Quick Search */}
        <form
          onSubmit={handleQuickSearchSubmit}
          className="hidden md:flex items-center relative max-w-xs w-full"
        >
          <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isRtl ? 'right-2.5' : 'left-2.5'}`} />
          <input
            type="text"
            value={quickSearchInput}
            onChange={(e) => setQuickSearchInput(e.target.value)}
            placeholder={t('searchAnotherPlayer')}
            className={`w-full py-1.5 text-xs bg-slate-900 border border-white/[0.08] focus:border-slate-500 rounded-lg text-white placeholder-slate-500 ${
              isRtl ? 'pr-8 pl-3' : 'pl-8 pr-3'
            } focus:outline-none transition-colors`}
          />
        </form>

        <div className="flex items-center gap-2">
          {pageState === 'reviewed' && (
            <button
              onClick={() => setPageState('profile')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-medium transition-colors"
            >
              <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              <span className="hidden sm:inline">{t('backToPlayerGames', { username: rawUsername })}</span>
            </button>
          )}

          {/* Language Switcher */}
          <button
            onClick={toggleLocale}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-white/[0.08] transition-colors"
            title={t('language')}
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('toggleLang')}</span>
          </button>

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

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-start">
        {/* Loading Player Profile */}
        {isLoadingProfile && (
          <div className="py-24 flex flex-col items-center justify-center space-y-4 max-w-md mx-auto text-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-xs font-mono text-slate-400">Loading @{rawUsername} profile & games...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoadingProfile && errorMessage && (
          <div className="py-16 max-w-md mx-auto text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900/50 flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">{t('playerNotFound')}</h2>
              <p className="text-xs text-slate-400">{errorMessage}</p>
            </div>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
              >
                <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                <span>Return to Home</span>
              </Link>
            </div>
          </div>
        )}

        {/* 1. Profile & Games View */}
        {!isLoadingProfile && !errorMessage && pageState === 'profile' && (
          <div className="space-y-6">
            {/* Player Profile Card */}
            <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
                {/* Left: Avatar & Username */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {profile?.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={rawUsername}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/[0.12] shadow-md bg-slate-950"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950 border-2 border-white/[0.12] flex items-center justify-center text-slate-500 shadow-md">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                    {profile?.title && (
                      <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-extrabold bg-amber-500 text-slate-950 shadow">
                        {profile.title}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        {profile?.name || rawUsername}
                      </h1>
                      <a
                        href={profile?.url || `https://www.chess.com/member/${rawUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                        title="View Chess.com Profile"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <p className="text-xs font-mono text-emerald-400 font-medium">@{rawUsername}</p>
                    {profile?.country && (
                      <p className="text-[11px] text-slate-500 uppercase font-mono">
                        {profile.country.split('/').pop()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Quick Ratings & Copy Link Button */}
                <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/[0.08] transition-colors"
                      title={t('copyProfileLink')}
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">{t('linkCopied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t('copyProfileLink')}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Ratings Pills */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {stats?.chess_rapid?.last && (
                      <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/[0.06] text-xs font-mono flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-sky-400" />
                        <span className="text-slate-400 text-[10px]">{t('rapid')}:</span>
                        <span className="font-bold text-white">{stats.chess_rapid.last.rating}</span>
                      </div>
                    )}
                    {stats?.chess_blitz?.last && (
                      <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/[0.06] text-xs font-mono flex items-center gap-1.5">
                        <Flame className="w-3 h-3 text-amber-400" />
                        <span className="text-slate-400 text-[10px]">{t('blitz')}:</span>
                        <span className="font-bold text-white">{stats.chess_blitz.last.rating}</span>
                      </div>
                    )}
                    {stats?.chess_bullet?.last && (
                      <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/[0.06] text-xs font-mono flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-rose-400" />
                        <span className="text-slate-400 text-[10px]">{t('bullet')}:</span>
                        <span className="font-bold text-white">{stats.chess_bullet.last.rating}</span>
                      </div>
                    )}
                    {stats?.chess_daily?.last && (
                      <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/[0.06] text-xs font-mono flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        <span className="text-slate-400 text-[10px]">{t('daily')}:</span>
                        <span className="font-bold text-white">{stats.chess_daily.last.rating}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 font-sans text-right hidden sm:block">
                    {t('bookmarkHint')}
                  </p>
                </div>
              </div>
            </div>

            {/* Games Section */}
            <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4">
              {/* Header & Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-white tracking-tight">
                    {t('recentGamesTitle')}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-mono">
                    {filteredGames.length}
                  </span>
                </div>

                {/* Time class filters */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-white/[0.06] text-xs font-medium">
                  {['all', 'rapid', 'blitz', 'bullet', 'daily'].map((tc) => (
                    <button
                      key={tc}
                      onClick={() => setSelectedTimeClass(tc)}
                      className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                        selectedTimeClass === tc
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tc === 'all' ? t('allGames') : tc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Games Grid */}
              {filteredGames.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs font-mono">
                  {t('noGamesFound')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredGames.map((game) => {
                    const opponent =
                      game.userColor === 'w' ? game.black : game.white;
                    const isWin = game.userWon === true;
                    const isLoss = game.userWon === false;

                    return (
                      <div
                        key={game.id}
                        className="p-3.5 bg-slate-950/60 border border-white/[0.06] hover:border-emerald-500/30 rounded-xl flex items-center justify-between text-xs transition-all group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full border border-white/[0.2] ${
                                game.userColor === 'w' ? 'bg-white' : 'bg-slate-700'
                              }`}
                              title={game.userColor === 'w' ? t('white') : t('black')}
                            />
                            <span className="font-medium text-slate-200 text-sm truncate max-w-[160px]">
                              {opponent.username}
                            </span>
                            <span className="text-slate-500 font-mono text-xs">
                              ({opponent.rating})
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-600" />
                              {game.timeControl}
                            </span>
                            <span>• {game.date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase ${
                              isWin
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : isLoss
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isWin ? t('win') : isLoss ? t('loss') : t('draw')}
                          </span>

                          <button
                            onClick={() => {
                              try {
                                const meta = parsePgnToMetadata(game.pgn, game.url);
                                handleStartAnalysis(game.pgn, meta);
                              } catch (e: any) {
                                alert(e.message || 'Failed to parse game PGN.');
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 font-medium text-xs border border-white/[0.08] hover:border-emerald-500 transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <span>{t('reviewGame')}</span>
                            <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Analyzing Mode */}
        {pageState === 'analyzing' && (
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
                setPageState('profile');
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors pt-2"
            >
              {t('cancel')}
            </button>
          </div>
        )}

        {/* 3. Interactive Review Mode */}
        {pageState === 'reviewed' && reviewReport && (
          <div className="space-y-4">
            {/* Header: Back to Games Button & Game Meta */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPageState('profile')}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
                >
                  <ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                  <span>{t('backToPlayerGames', { username: rawUsername })}</span>
                </button>

                <div className="flex items-center gap-1.5 font-semibold text-white pl-2 border-l border-white/[0.08]">
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
              {/* Left: Interactive Board with Variations & Controls */}
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

              {/* Right: Coach Banner, Summary & Move List */}
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
