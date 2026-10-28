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
  Clipboard,
  Clock,
  ArrowRight,
  AlertCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';

interface GameImporterProps {
  onLoadGame: (pgn: string, metadata: GameMetadata) => void;
  isLoading?: boolean;
}

export const SAMPLE_GAMES = [
  {
    title: 'Morphy vs. Duke of Brunswick (Opera Game)',
    subtitle: 'Paris, 1858 — Rapid piece coordination and queen sacrifice',
    white: 'Paul Morphy',
    black: 'Duke Karl / Count Isouard',
    year: '1858',
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
    title: 'Kasparov vs. Topalov (Kasparov\'s Immortal)',
    subtitle: 'Wijk aan Zee, 1999 — Dynamic rook sacrifice and King march',
    white: 'Garry Kasparov',
    black: 'Veselin Topalov',
    year: '1999',
    pgn: `[Event "Hoogovens Group A"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]
[ECO "B07"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 tactics 1-0`,
  },
  {
    title: 'Tactical Comeback Game',
    subtitle: 'Open Italian position with multiple tactical swings and mistake recoveries',
    white: 'Player A',
    black: 'Player B',
    year: '2024',
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
      // Clipboard permissions
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
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Segmented Control Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-white/[0.06]">
          <button
            onClick={() => setActiveTab('omnibox')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'omnibox'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Search or URL
          </button>
          <button
            onClick={() => setActiveTab('pgn')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'pgn'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste PGN
          </button>
          <button
            onClick={() => setActiveTab('samples')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'samples'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Library Games
          </button>
        </div>

        <button
          onClick={handlePasteClipboard}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-white/[0.06] transition-colors"
        >
          <Clipboard className="w-3.5 h-3.5 text-slate-400" />
          <span>Paste</span>
        </button>
      </div>

      {/* Omnibox Search Tab */}
      {activeTab === 'omnibox' && (
        <div className="space-y-4">
          <form onSubmit={handleOmniboxSubmit} className="relative flex items-center">
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Chess.com username, game link, or Lichess URL..."
              className="w-full pl-10 pr-24 py-2.5 bg-slate-900 border border-white/[0.08] focus:border-slate-500 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isFetchingGames || isLoading || !inputVal.trim()}
              className="absolute right-1.5 px-3 py-1.5 bg-slate-100 hover:bg-white disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-md transition-colors flex items-center gap-1"
            >
              {isFetchingGames ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Loading</span>
                </>
              ) : (
                <>
                  <span>Load</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          </form>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Player Suggestions */}
          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
            <span className="text-slate-500 font-mono text-[11px]">Popular profiles:</span>
            {['hikaru', 'magnuscarlsen', 'daniilnaroditsky'].map((user) => (
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
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-white/[0.06] font-mono transition-colors"
              >
                {user}
              </button>
            ))}
          </div>

          {/* Recent Games List */}
          {searchedUser && (
            <div className="bg-slate-900/70 border border-white/[0.08] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Player:</span>
                  <span className="font-semibold text-white font-mono">@{searchedUser}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {recentGames.length} games available
                </span>
              </div>

              {recentGames.length === 0 && !isFetchingGames && (
                <div className="text-center py-6 text-slate-500 text-xs font-mono">
                  No games found in the current archive.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {recentGames.map((game) => {
                  const opponent =
                    game.userColor === 'w' ? game.black : game.white;
                  const isWin = game.userWon === true;
                  const isLoss = game.userWon === false;

                  return (
                    <div
                      key={game.id}
                      className="p-2.5 bg-slate-950/60 border border-white/[0.06] hover:border-white/[0.12] rounded-lg flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              game.userColor === 'w' ? 'bg-slate-200' : 'bg-slate-600'
                            }`}
                          />
                          <span className="font-medium text-slate-200 truncate max-w-[130px]">
                            {opponent.username}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            {opponent.rating}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-600" />
                            {game.timeControl}
                          </span>
                          <span>{game.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                            isWin
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isLoss
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {isWin ? 'Win' : isLoss ? 'Loss' : 'Draw'}
                        </span>

                        <button
                          onClick={() => {
                            const meta = parsePgnToMetadata(game.pgn, game.url);
                            onLoadGame(game.pgn, meta);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-white/[0.06] transition-colors"
                        >
                          Review
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
            placeholder="[Event &quot;Live Chess&quot;]&#10;1. e4 e5 2. Nf3 Nc6..."
            className="w-full p-3 bg-slate-900 border border-white/[0.08] focus:border-slate-500 rounded-lg text-white font-mono text-xs placeholder-slate-600 focus:outline-none transition-colors"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !rawPgnVal.trim()}
              className="px-4 py-2 bg-slate-100 hover:bg-white disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-md transition-colors"
            >
              Analyze PGN
            </button>
          </div>
        </form>
      )}

      {/* Preset Library Games Tab */}
      {activeTab === 'samples' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SAMPLE_GAMES.map((sample, idx) => (
            <div
              key={idx}
              className="bg-slate-900/70 border border-white/[0.08] hover:border-white/[0.14] rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{sample.year}</span>
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <h4 className="font-semibold text-sm text-slate-200">{sample.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {sample.subtitle}
                </p>
              </div>

              <button
                onClick={() => {
                  const meta = parsePgnToMetadata(sample.pgn);
                  onLoadGame(sample.pgn, meta);
                }}
                className="w-full py-1.5 px-3 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-white/[0.06] transition-colors"
              >
                Analyze Game
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
