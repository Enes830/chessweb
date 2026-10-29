import { GameMetadata, RecentGameItem, ChessComProfile, ChessComStats } from '@/types/chess';
import { Chess } from 'chess.js';

export interface ChessComGameRecord {
  url: string;
  pgn: string;
  time_control: string;
  time_class?: string;
  end_time: number;
  rated: boolean;
  white: {
    username: string;
    rating: number;
    result: string;
    '@id'?: string;
  };
  black: {
    username: string;
    rating: number;
    result: string;
    '@id'?: string;
  };
}

/**
 * Normalizes input detection:
 * - 'chesscom_user'
 * - 'chesscom_url'
 * - 'lichess_url'
 * - 'pgn'
 */
export type InputType = 'chesscom_user' | 'chesscom_url' | 'lichess_url' | 'pgn';

export function detectInputType(rawInput: string): { type: InputType; parsedValue: string } {
  const input = rawInput.trim();

  // 1. Chess.com Game URL
  if (
    input.includes('chess.com/game/live/') ||
    input.includes('chess.com/game/daily/') ||
    input.includes('chess.com/analysis/game/live/') ||
    input.includes('chess.com/analysis/game/daily/')
  ) {
    return { type: 'chesscom_url', parsedValue: input };
  }

  // 2. Lichess Game URL
  if (input.includes('lichess.org/')) {
    return { type: 'lichess_url', parsedValue: input };
  }

  // 3. Raw PGN (contains 1. or PGN headers like [Event ...])
  if (
    input.includes('[Event ') ||
    input.includes('[Site ') ||
    input.includes('[White ') ||
    input.includes('1.') ||
    input.includes('1...')
  ) {
    return { type: 'pgn', parsedValue: input };
  }

  // 4. Default: Chess.com Username (alphanumeric, underscores, hyphens)
  const username = input.replace(/^@/, '').trim();
  return { type: 'chesscom_user', parsedValue: username };
}

/**
 * Fetches recent games for a Chess.com player
 */
export async function fetchChessComUserGames(username: string): Promise<RecentGameItem[]> {
  const cleanUser = username.trim().toLowerCase();
  const archivesRes = await fetch(`https://api.chess.com/pub/player/${cleanUser}/games/archives`, {
    headers: { 'User-Agent': 'RewindBoard-Chess-Review (contact: support@rewindboard.com)' },
  });

  if (!archivesRes.ok) {
    if (archivesRes.status === 404) {
      throw new Error(`Chess.com user "${username}" was not found.`);
    }
    throw new Error(`Failed to fetch archives for "${username}" (HTTP ${archivesRes.status})`);
  }

  const archivesData = await archivesRes.json();
  const archives: string[] = archivesData.archives || [];

  if (archives.length === 0) {
    return [];
  }

  // Fetch the most recent month archive
  const latestArchiveUrl = archives[archives.length - 1];
  const gamesRes = await fetch(latestArchiveUrl, {
    headers: { 'User-Agent': 'RewindBoard-Chess-Review (contact: support@rewindboard.com)' },
  });

  if (!gamesRes.ok) {
    throw new Error(`Failed to fetch recent games archive.`);
  }

  const gamesData = await gamesRes.json();
  const games: ChessComGameRecord[] = gamesData.games || [];

  // Sort descending by end_time and take the latest 20 games
  const sortedGames = games.sort((a, b) => b.end_time - a.end_time).slice(0, 20);

  return sortedGames.map((g, idx) => {
    const isUserWhite = g.white.username.toLowerCase() === cleanUser;
    const userResult = isUserWhite ? g.white.result : g.black.result;
    const userWon = userResult === 'win' ? true : ['agreed', 'repetition', 'stalemate', 'insufficient', '50move'].includes(userResult) ? null : false;

    // Date formatted
    const dateStr = new Date(g.end_time * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      id: g.url ? g.url.split('/').pop() || `game-${idx}` : `game-${idx}`,
      url: g.url,
      date: dateStr,
      timeControl: formatTimeControl(g.time_control),
      timeClass: g.time_class,
      white: {
        username: g.white.username,
        rating: g.white.rating,
        result: g.white.result,
      },
      black: {
        username: g.black.username,
        rating: g.black.rating,
        result: g.black.result,
      },
      userColor: isUserWhite ? 'w' : 'b',
      userWon,
      pgn: g.pgn,
    };
  });
}

/**
 * Fetches player profile details from Chess.com (avatar, title, joined, name)
 */
export async function fetchChessComUserProfile(username: string): Promise<ChessComProfile> {
  const cleanUser = username.trim().toLowerCase();
  const res = await fetch(`https://api.chess.com/pub/player/${cleanUser}`, {
    headers: { 'User-Agent': 'RewindBoard-Chess-Review (contact: support@rewindboard.com)' },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Chess.com user "${username}" was not found.`);
    }
    throw new Error(`Failed to fetch profile for "${username}" (HTTP ${res.status})`);
  }

  const data = await res.json();
  return {
    username: data.username || username,
    name: data.name,
    avatar: data.avatar,
    title: data.title,
    country: data.country,
    joined: data.joined,
    url: data.url,
    followers: data.followers,
  };
}

/**
 * Fetches player rating statistics from Chess.com (Rapid, Blitz, Bullet, Daily)
 */
export async function fetchChessComUserStats(username: string): Promise<ChessComStats> {
  const cleanUser = username.trim().toLowerCase();
  try {
    const res = await fetch(`https://api.chess.com/pub/player/${cleanUser}/stats`, {
      headers: { 'User-Agent': 'RewindBoard-Chess-Review (contact: support@rewindboard.com)' },
    });
    if (!res.ok) {
      return {};
    }
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * Format Chess.com time control string (e.g. "180+2" or "600") to friendly format
 */
export function formatTimeControl(tc: string): string {
  if (!tc) return 'Standard';
  if (tc.includes('+')) {
    const [base, inc] = tc.split('+');
    const baseMin = Math.floor(parseInt(base, 10) / 60);
    return `${baseMin}+${inc}`;
  }
  const sec = parseInt(tc, 10);
  if (!isNaN(sec)) {
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    return `${min} min`;
  }
  return tc;
}

/**
 * Extracts game ID from a Lichess URL (e.g., "https://lichess.org/mY62Bq5b" -> "mY62Bq5b")
 */
export function extractLichessId(url: string): string {
  const match = url.match(/lichess\.org\/([A-Za-z0-9]{8})/);
  if (match) return match[1];
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1].slice(0, 8);
}

/**
 * Extracts game ID from a Chess.com URL
 */
export function extractChessComId(url: string): string {
  const match = url.match(/chess\.com\/(?:analysis\/)?game\/(?:live|daily)\/([0-9]+)/);
  if (match) return match[1];
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

/**
 * Parses PGN headers and metadata into GameMetadata object
 */
export function parsePgnToMetadata(pgn: string, fallbackUrl?: string): GameMetadata {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch (e) {
    console.warn('Chess.js loadPgn warning:', e);
  }

  const header = chess.header();

  const whiteName = header['White'] || 'White';
  const blackName = header['Black'] || 'Black';
  const whiteRating = header['WhiteElo'] ? parseInt(header['WhiteElo'], 10) : undefined;
  const blackRating = header['BlackElo'] ? parseInt(header['BlackElo'], 10) : undefined;
  const result = header['Result'] || '*';
  const date = header['Date'] || new Date().toISOString().split('T')[0];
  const timeControl = header['TimeControl'] ? formatTimeControl(header['TimeControl']) : undefined;
  const eco = header['ECO'] || undefined;
  const opening = header['Opening'] || undefined;

  let site: 'chesscom' | 'lichess' | 'pgn' = 'pgn';
  if (fallbackUrl?.includes('chess.com') || header['Site']?.includes('chess.com')) {
    site = 'chesscom';
  } else if (fallbackUrl?.includes('lichess.org') || header['Site']?.includes('lichess.org')) {
    site = 'lichess';
  }

  return {
    url: fallbackUrl || header['Link'] || undefined,
    site,
    date,
    timeControl,
    white: {
      username: whiteName,
      rating: whiteRating,
      result: result === '1-0' ? 'win' : result === '0-1' ? 'loss' : 'draw',
    },
    black: {
      username: blackName,
      rating: blackRating,
      result: result === '0-1' ? 'win' : result === '1-0' ? 'loss' : 'draw',
    },
    result,
    eco,
    opening,
    pgn,
  };
}
