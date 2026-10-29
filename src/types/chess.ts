export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'missed_win';

export interface ClassificationMeta {
  type: MoveClassification;
  symbol: string;
  name: string;
  color: string;
  bgColor: string;
  description: string;
}

export interface PlayerInfo {
  username: string;
  rating?: number;
  avatarUrl?: string;
  result?: string;
  accuracy?: number;
  estimatedElo?: number;
}

export interface MoveAnalysis {
  ply: number;
  moveNumber: number;
  turn: 'w' | 'b';
  san: string;
  uci: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore: number; // centipawns or mate-scaled (-10000..10000)
  evalAfter: number;
  isMateBefore?: boolean;
  mateBefore?: number;
  isMateAfter?: boolean;
  mateAfter?: number;
  winPctBefore: number;
  winPctAfter: number;
  winPctLoss: number;
  bestMoveUci: string;
  bestMoveSan: string;
  pv: string[];
  classification: MoveClassification;
  explanation?: string;
  openingName?: string;
  pieceSacrificed?: boolean;
}

export interface GameMetadata {
  id?: string;
  site?: 'chesscom' | 'lichess' | 'pgn';
  url?: string;
  date?: string;
  timeControl?: string;
  white: PlayerInfo;
  black: PlayerInfo;
  result: string;
  eco?: string;
  opening?: string;
  initialFen?: string;
  pgn: string;
}

export interface GameReviewReport {
  metadata: GameMetadata;
  moves: MoveAnalysis[];
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteEstimatedElo: number;
  blackEstimatedElo: number;
  classificationsCount: {
    white: Record<MoveClassification, number>;
    black: Record<MoveClassification, number>;
  };
  puzzles: RewindPuzzlePayload[];
}

export type PuzzleType = 'BLUNDER' | 'MISSED_BRILLIANT' | 'MISSED_WIN' | 'MISTAKE';

/**
 * Shared JSON schema with companion Telegram Bot (RewindChess)
 */
export interface RewindPuzzlePayload {
  id: string;
  source_game_url?: string;
  white_player: string;
  black_player: string;
  player_color: 'w' | 'b';
  ply: number;
  move_number: number;
  fen_before_move: string;
  opponent_last_move_uci?: string;
  user_played_move_uci: string;
  user_played_move_san: string;
  best_move_uci: string;
  best_move_san: string;
  continuation_uci: string[];
  eval_before_cp: number;
  eval_after_cp: number;
  puzzle_type: PuzzleType;
  explanation: string;
  created_at: string;
}

export interface RecentGameItem {
  id: string;
  url: string;
  date: string;
  timeControl: string;
  timeClass?: string;
  white: { username: string; rating: number; result: string };
  black: { username: string; rating: number; result: string };
  userColor: 'w' | 'b';
  userWon: boolean | null; // null for draw
  pgn: string;
}

export interface EngineEvalResult {
  depth: number;
  scoreCp?: number;
  mate?: number;
  bestMove: string;
  pv: string[];
  multiPVEvals?: {
    pvIndex: number;
    scoreCp?: number;
    mate?: number;
    bestMove: string;
    pv: string[];
  }[];
}

export interface VariationMove {
  san: string;
  uci: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  evalCp?: number;
  mate?: number;
  bestMoveUci?: string;
  bestMoveSan?: string;
  pv?: string[];
}

export interface ChessComProfile {
  username: string;
  name?: string;
  avatar?: string;
  title?: string;
  country?: string;
  joined?: number;
  url?: string;
  followers?: number;
}

export interface ChessComStats {
  chess_rapid?: { last?: { rating: number; date?: number } };
  chess_blitz?: { last?: { rating: number; date?: number } };
  chess_bullet?: { last?: { rating: number; date?: number } };
  chess_daily?: { last?: { rating: number; date?: number } };
}

