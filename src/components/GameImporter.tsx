'use client';

import React, { useState } from 'react';
import {
  detectInputType,
  fetchChessComUserGames,
  parsePgnToMetadata,
} from '@/lib/chesscom';
import { RecentGameItem, GameMetadata } from '@/types/chess';
import {
  Search,
  Sparkles,
  Clipboard,
  Clock,
  Swords,
  ChevronRight,
  AlertCircle,
  Loader2,
  Trophy,
} from 'lucide-react';

interface GameImporterProps {
  onLoadGame: (pgn: string, metadata: GameMetadata) => void;
  isLoading?: boolean;
}

// Preset sample games for instant demonstration
export const SAMPLE_GAMES = [
  {
    title: 'Morphy vs Duke of Brunswick (Opera Game)',
    subtitle: 'Classic masterpiece of development and Queen sacrifice',
    pgn: `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.11.02"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]
[ECO "C41"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`,
  },
  {
    title: "Kasparov's Immortal (Kasparov vs Topalov)",
    subtitle: 'Brilliant double rook sacrifice and king hunt in Wijk aan Zee',
    pgn: `[Event "Hoogovens Group A"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]
[ECO "B07"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`,
  },
  {
    title: 'Tactical Blunder & Comeback Game',
    subtitle: 'Contains blunders, mistakes, and missed win opportunities to retry',
    pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.08.15"]
[White "TacticalPlayer"]
[Black "Challenger"]
[Result "0-1"]
[ECO "C50"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. Nc3 d6 6. Bg5 h6 7. Bh4 g5 8. Bg3 Bg4 9. h3 Bh5 10. Nd5 Nd4 11. c3 Nxf3+ 12. gxf3 c6 13. Ne3 Qd7 14. Nf5 O-O-O 15. Qe2 d5 16. Bb3 dxe4 17. dxe4 Nxe4 18. Qxe4 Qd2+ 19. Kf1 Rd3 20. Rd1 Qxd1+ 21. Bxd1 Rxd1+ 22. Kg2 Rxh1 23. Kxh1 f6 24. Ne7+ Bxe7 25. Qf5+ Kd8 26. Bxe5 fxe5 27. Qxe5 Bxf3+ 28. Kg1 Re8 29. Qb8+ Kd7 30. Qxb7+ Ke6 0-1`,
  },
];

export const GameImporter: React.FC<GameImporterProps> = ({ onLoadGame, isLoading = false }) => {
  const [inputVal, setInputVal] = useState('');
  const [activeTab, setActiveTab] = useState<'omnibox' | 'pgn' | 'samples'>('omnibox');
  const [recentGames, setRecentGames] = useState<RecentGameItem[]>([]);
  const [isFetchingGames, setIsFetchingGames] = useState(false);
  const [searchedUser, setSearchedUser] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rawPgnVal, setRawPgnVal] = useState('');

  const handleOmniboxSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputVal.trim();
    if (!query) return;

    setErrorMsg(null);
    const { type, parsedValue } = detectInputType(query);

    if (type === 'chesscom_user') {
      setIsFetchingGames(true);
      setSearchedUser(parsedValue);
      try {
        const games = await fetchChessComUserGames(parsedValue);
        setRecentGames(games);
        if (games.length === 0) {
          setErrorMsg(`No recent games found for Chess.com user "${parsedValue}".`);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to fetch player games.');
        setRecentGames([]);
      } finally {
        setIsFetchingGames(false);
      }
    } else if (type === 'chesscom_url' || type === 'lichess_url') {
      setIsFetchingGames(true);
      try {
        const res = await fetch('/api/fetch-game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: query }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to resolve game URL.');
        }
        onLoadGame(data.pgn, data.metadata);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load game URL.');
      } finally {
        setIsFetchingGames(false);
      }
    } else if (type === 'pgn') {
      try {
        const meta = parsePgnToMetadata(query);
        onLoadGame(query, meta);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to parse PGN.');
      }
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputVal(text);
      if (text.includes('[Event ') || text.includes('1.')) {
        setActiveTab('pgn');
        setRawPgnVal(text);
      }
    } catch {
      // Fallback
    }
  };

  const handleRawPgnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawPgnVal.trim()) return;
    try {
      const meta = parsePgnToMetadata(rawPgnVal);
      onLoadGame(rawPgnVal, meta);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid PGN format.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('omnibox')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'omnibox'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Omnibox Search
          </button>
          <button
            onClick={() => setActiveTab('pgn')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'pgn'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Raw PGN
          </button>
          <button
            onClick={() => setActiveTab('samples')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'samples'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Featured Masterpieces
          </button>
        </div>

        <button
          onClick={handlePasteClipboard}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition-colors"
          title="Paste from clipboard"
        >
          <Clipboard className="w-3.5 h-3.5 text-sky-400" />
          <span>Paste Clipboard</span>
        </button>
      </div>

      {/* Omnibox Search Tab */}
      {activeTab === 'omnibox' && (
        <div className="space-y-4">
          <form onSubmit={handleOmniboxSubmit} className="relative flex items-center">
            <div className="absolute left-4 text-slate-400 pointer-events-none">
              <Search className="w-5 h-5 text-sky-400" />
            </div>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Enter Chess.com Username (e.g. hikaru), Chess.com URL, or Lichess URL..."
              className="w-full pl-12 pr-28 py-3.5 bg-slate-900 border border-slate-700/80 focus:border-sky-500 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 shadow-inner"
            />
            <button
              type="submit"
              disabled={isFetchingGames || isLoading || !inputVal.trim()}
              className="absolute right-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md flex items-center gap-1.5"
            >
              {isFetchingGames ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>Fetch Game</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick tags */}
          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
            <span className="text-slate-500">Quick Try Users:</span>
            {['hikaru', 'magnuscarlsen', 'daniilnaroditsky', 'nihalsarin2004'].map((user) => (
              <button
                key={user}
                type="button"
                onClick={() => {
                  setInputVal(user);
                  setIsFetchingGames(true);
                  setSearchedUser(user);
                  fetchChessComUserGames(user)
                    .then((games) => {
                      setRecentGames(games);
                      setErrorMsg(null);
                    })
                    .catch((e) => setErrorMsg(e.message))
                    .finally(() => setIsFetchingGames(false));
                }}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700/80 font-mono transition-colors"
              >
                @{user}
              </button>
            ))}
          </div>

          {/* Recent Games List (when username searched) */}
          {searchedUser && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-sm text-white">
                    Recent Games for <span className="text-sky-400">@{searchedUser}</span>
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {recentGames.length} games loaded
                </span>
              </div>

              {recentGames.length === 0 && !isFetchingGames && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No games found in the latest archive.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                {recentGames.map((game) => {
                  const opponent =
                    game.userColor === 'w' ? game.black : game.white;
                  const isWin = game.userWon === true;
                  const isLoss = game.userWon === false;

                  return (
                    <div
                      key={game.id}
                      className="p-3 bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-xl flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              game.userColor === 'w' ? 'bg-slate-200' : 'bg-slate-600'
                            }`}
                            title={`Played as ${game.userColor === 'w' ? 'White' : 'Black'}`}
                          />
                          <span className="font-semibold text-white">
                            vs {opponent.username}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            ({opponent.rating})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {game.timeControl}
                          </span>
                          <span>•</span>
                          <span>{game.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isWin
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isLoss
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-slate-700/40 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {isWin ? 'Win' : isLoss ? 'Loss' : 'Draw'}
                        </span>

                        <button
                          onClick={() => {
                            const meta = parsePgnToMetadata(game.pgn, game.url);
                            onLoadGame(game.pgn, meta);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-sm transition-all hover:scale-105"
                        >
                          Analyze
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Raw PGN Tab */}
      {activeTab === 'pgn' && (
        <form onSubmit={handleRawPgnSubmit} className="space-y-3">
          <textarea
            value={rawPgnVal}
            onChange={(e) => setRawPgnVal(e.target.value)}
            rows={7}
            placeholder="Paste raw PGN text here (e.g., [Event ...] 1. e4 e5 2. Nf3 ...)"
            className="w-full p-3.5 bg-slate-900 border border-slate-700/80 focus:border-sky-500 rounded-xl text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 shadow-inner"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !rawPgnVal.trim()}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Swords className="w-4 h-4" />
              <span>Analyze PGN Game</span>
            </button>
          </div>
        </form>
      )}

      {/* Featured Masterpieces Tab */}
      {activeTab === 'samples' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SAMPLE_GAMES.map((sample, idx) => (
            <div
              key={idx}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-lg transition-colors"
            >
              <div>
                <h4 className="font-bold text-sm text-white">{sample.title}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {sample.subtitle}
                </p>
              </div>

              <button
                onClick={() => {
                  const meta = parsePgnToMetadata(sample.pgn);
                  onLoadGame(sample.pgn, meta);
                }}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-200 font-bold text-xs border border-slate-700 hover:border-transparent transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Load & Review</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
