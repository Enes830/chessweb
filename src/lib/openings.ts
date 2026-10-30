import openingsData from '@/lib/openingsData.json';

export interface OpeningDefinition {
  eco: string;
  name: string;
  fenPrefix: string;
}

/** Legal position identity: placement, turn, castling and legal en-passant target.
 * Counters do not change opening identity. Generated with chess.js, like review FENs.
 */
export function getFenPrefix(fen: string): string {
  return fen.trim().split(/\s+/).slice(0, 4).join(' ');
}

// Generated from CC0 lichess-org/chess-openings by scripts/update-openings.mjs.
const OPENING_MAP = new Map<string, OpeningDefinition>(
  openingsData.map(({ eco, name, fen }) => [fen, { eco, name, fenPrefix: fen }])
);
export const OPENINGS = Array.from(OPENING_MAP.values());

export function lookupOpening(fen: string): OpeningDefinition | null {
  if (fen.trim().split(/\s+/).length < 4) return null;
  return OPENING_MAP.get(getFenPrefix(fen)) ?? null;
}
