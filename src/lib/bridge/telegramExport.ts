import {
  GameMetadata,
  MoveAnalysis,
  PuzzleType,
  RewindPuzzlePayload,
} from '@/types/chess';

const STORAGE_KEY = 'rewind_puzzles';

/**
 * Extracts mistakes, blunders, missed brilliancies, and missed wins into RewindPuzzlePayload
 */
export function extractPuzzlesFromAnalysis(
  moves: MoveAnalysis[],
  metadata: GameMetadata
): RewindPuzzlePayload[] {
  const puzzles: RewindPuzzlePayload[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const prevMove = i > 0 ? moves[i - 1] : undefined;

    let puzzleType: PuzzleType | null = null;
    if (move.classification === 'blunder') {
      puzzleType = 'BLUNDER';
    } else if (move.classification === 'missed_win') {
      puzzleType = 'MISSED_WIN';
    } else if (move.classification === 'mistake') {
      puzzleType = 'MISTAKE';
    } else if (move.classification === 'brilliant') {
      puzzleType = 'MISSED_BRILLIANT'; // Can be trained as finding the brilliancy!
    }

    if (!puzzleType) continue;

    const playerColor = move.turn;
    const opponentColor = playerColor === 'w' ? 'Black' : 'White';
    const playerName = playerColor === 'w' ? metadata.white.username : metadata.black.username;

    // Build continuation sequence from bestMove and engine PV
    const continuation = move.pv && move.pv.length > 0 ? move.pv.slice(0, 5) : [move.bestMoveUci];

    const puzzle: RewindPuzzlePayload = {
      id: `puz_${Date.now()}_ply_${move.ply}`,
      source_game_url: metadata.url,
      white_player: metadata.white.username,
      black_player: metadata.black.username,
      player_color: move.turn,
      ply: move.ply,
      move_number: move.moveNumber,
      fen_before_move: move.fenBefore,
      opponent_last_move_uci: prevMove ? prevMove.uci : undefined,
      user_played_move_uci: move.uci,
      user_played_move_san: move.san,
      best_move_uci: move.bestMoveUci,
      best_move_san: move.bestMoveSan,
      continuation_uci: continuation,
      eval_before_cp: Math.round(move.evalBefore),
      eval_after_cp: Math.round(move.evalAfter),
      puzzle_type: puzzleType,
      explanation: move.explanation || `Find the best move for ${move.turn === 'w' ? 'White' : 'Black'}.`,
      created_at: new Date().toISOString(),
    };

    puzzles.push(puzzle);
  }

  return puzzles;
}

/**
 * Persists analyzed puzzles into localStorage
 */
export function savePuzzlesToLocalStorage(newPuzzles: RewindPuzzlePayload[]): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getPuzzlesFromLocalStorage();
    const existingIds = new Set(existing.map((p) => `${p.fen_before_move}_${p.user_played_move_uci}`));

    const merged = [...existing];
    for (const p of newPuzzles) {
      const key = `${p.fen_before_move}_${p.user_played_move_uci}`;
      if (!existingIds.has(key)) {
        merged.push(p);
        existingIds.add(key);
      }
    }

    // Keep up to 200 most recent puzzles
    const trimmed = merged.slice(-200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save puzzles to localStorage:', e);
  }
}

/**
 * Retrieves all stored puzzles from localStorage
 */
export function getPuzzlesFromLocalStorage(): RewindPuzzlePayload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Encodes payload into Base64 for Telegram deep link
 */
export function encodePayloadForTelegram(payload: any): string {
  const json = JSON.stringify(payload);
  if (typeof window !== 'undefined' && window.btoa) {
    return encodeURIComponent(window.btoa(unescape(encodeURIComponent(json))));
  }
  return Buffer.from(json).toString('base64');
}

/**
 * Generates Telegram deep link: https://t.me/{bot_username}?start=import_{base64}
 */
export function createTelegramBotDeepLink(
  puzzles: RewindPuzzlePayload[],
  botUsername?: string
): string {
  const username =
    botUsername ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
    'RewindChessBot';

  // Include compact version to stay within Telegram 64-char start parameter or link format
  // For deep links, Telegram /start parameter allows up to 64 chars base64,
  // or we can link with startapp webapp or direct URL
  const compactData = puzzles.slice(0, 3).map((p) => ({
    f: p.fen_before_move,
    b: p.best_move_uci,
    u: p.user_played_move_uci,
    t: p.puzzle_type,
  }));

  const encoded = encodePayloadForTelegram(compactData);
  // If encoded fits Telegram start param (<= 64 chars), use start=import_...
  // Otherwise use WebApp / Webhook or query param
  if (encoded.length <= 50) {
    return `https://t.me/${username}?start=import_${encoded}`;
  }

  return `https://t.me/${username}?start=rewind_review`;
}

/**
 * Posts puzzles to a configured webhook endpoint
 */
export async function sendPuzzlesToWebhook(
  puzzles: RewindPuzzlePayload[],
  webhookUrl?: string
): Promise<{ success: boolean; message: string }> {
  const targetUrl = webhookUrl || process.env.NEXT_PUBLIC_BOT_WEBHOOK_URL;
  if (!targetUrl) {
    return {
      success: false,
      message: 'No Telegram Bot webhook URL configured (NEXT_PUBLIC_BOT_WEBHOOK_URL).',
    };
  }

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'RewindBoard Web',
        timestamp: new Date().toISOString(),
        puzzles_count: puzzles.length,
        puzzles,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server responded with status ${res.status}`);
    }

    return { success: true, message: `Successfully sent ${puzzles.length} puzzles to Telegram Bot!` };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to dispatch puzzles to webhook.',
    };
  }
}
