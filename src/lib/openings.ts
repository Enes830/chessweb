/**
 * Top 50+ ECO Openings by FEN position prefix (piece placement + active turn)
 */
export interface OpeningDefinition {
  eco: string;
  name: string;
  fenPrefix: string;
}

export const OPENINGS: OpeningDefinition[] = [
  // Starting position
  { eco: 'A00', name: 'Start Position', fenPrefix: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w' },

  // King's Pawn Openings (1. e4)
  { eco: 'B00', name: "King's Pawn Game", fenPrefix: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b' },
  { eco: 'C20', name: 'Open Game (1. e4 e5)', fenPrefix: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w' },
  { eco: 'C40', name: "King's Knight Opening", fenPrefix: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b' },
  { eco: 'C44', name: "King's Pawn Game: Normal Variation", fenPrefix: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w' },
  { eco: 'C50', name: 'Italian Game', fenPrefix: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b' },
  { eco: 'C50', name: 'Italian Game: Giuoco Piano', fenPrefix: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w' },
  { eco: 'C55', name: 'Two Knights Defense', fenPrefix: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w' },
  { eco: 'C51', name: 'Evans Gambit', fenPrefix: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/1PB1P3/5N2/P1PP1PPP/RNBQK2R b' },
  { eco: 'C60', name: 'Ruy Lopez', fenPrefix: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b' },
  { eco: 'C65', name: 'Ruy Lopez: Berlin Defense', fenPrefix: 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w' },
  { eco: 'C68', name: 'Ruy Lopez: Exchange Variation', fenPrefix: 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w' },
  { eco: 'C45', name: 'Scotch Game', fenPrefix: 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b' },
  { eco: 'C42', name: "Petrov's Defense", fenPrefix: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w' },
  { eco: 'C46', name: 'Three Knights Opening', fenPrefix: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R b' },
  { eco: 'C47', name: 'Four Knights Game', fenPrefix: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w' },
  { eco: 'C30', name: "King's Gambit", fenPrefix: 'rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b' },
  { eco: 'C23', name: "Bishop's Opening", fenPrefix: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b' },
  { eco: 'C25', name: 'Vienna Game', fenPrefix: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b' },

  // Sicilian Defense (1. e4 c5)
  { eco: 'B20', name: 'Sicilian Defense', fenPrefix: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w' },
  { eco: 'B21', name: 'Sicilian Defense: Smith-Morra Gambit', fenPrefix: 'rnbqkbnr/pp1ppppp/8/2p5/3PP3/8/PPP2PPP/RNBQKBNR b' },
  { eco: 'B22', name: 'Sicilian Defense: Alapin Variation', fenPrefix: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/2P5/PP1P1PPP/RNBQKBNR b' },
  { eco: 'B23', name: 'Sicilian Defense: Closed', fenPrefix: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/2N5/PPPP1PPP/R1BQKBNR b' },
  { eco: 'B27', name: 'Sicilian Defense: Open', fenPrefix: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b' },
  { eco: 'B32', name: 'Sicilian Defense: Open 2...Nc6', fenPrefix: 'r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w' },
  { eco: 'B34', name: 'Sicilian Defense: Accelerated Dragon', fenPrefix: 'r1bqkbnr/pp1ppp1p/2n3p1/8/3NP3/8/PPP2PPP/RNBQKB1R w' },
  { eco: 'B50', name: 'Sicilian Defense: Modern Variations', fenPrefix: 'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w' },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', fenPrefix: 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w' },
  { eco: 'B70', name: 'Sicilian Defense: Dragon Variation', fenPrefix: 'rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w' },
  { eco: 'B40', name: 'Sicilian Defense: Paulsen / Kan Variation', fenPrefix: 'rnbqkbnr/pp1p1ppp/4p3/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w' },

  // French & Caro-Kann
  { eco: 'C00', name: 'French Defense', fenPrefix: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w' },
  { eco: 'C02', name: 'French Defense: Advance Variation', fenPrefix: 'rnbqkbnr/pppp1ppp/4p3/4P3/8/8/PPPP1PPP/RNBQKBNR b' },
  { eco: 'C10', name: 'French Defense: Paulsen Variation', fenPrefix: 'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b' },
  { eco: 'B10', name: 'Caro-Kann Defense', fenPrefix: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w' },
  { eco: 'B12', name: 'Caro-Kann Defense: Advance Variation', fenPrefix: 'rnbqkbnr/pp1ppppp/2p5/4P3/8/8/PPPP1PPP/RNBQKBNR b' },
  { eco: 'B15', name: 'Caro-Kann Defense: Classical / Tartakower', fenPrefix: 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w' },

  // Scandinavian & Pirc
  { eco: 'B01', name: 'Scandinavian Defense', fenPrefix: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w' },
  { eco: 'B07', name: 'Pirc Defense', fenPrefix: 'rnbqkbnr/ppp1pppp/3p4/8/4P3/8/PPPP1PPP/RNBQKBNR w' },
  { eco: 'B02', name: "Alekhine's Defense", fenPrefix: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w' },

  // Queen's Pawn Openings (1. d4)
  { eco: 'A40', name: "Queen's Pawn Game", fenPrefix: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b' },
  { eco: 'D00', name: "Queen's Pawn Game: Closed", fenPrefix: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w' },
  { eco: 'D02', name: 'London System', fenPrefix: 'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b' },
  { eco: 'D06', name: "Queen's Gambit", fenPrefix: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b' },
  { eco: 'D20', name: "Queen's Gambit Accepted", fenPrefix: 'rnbqkbnr/ppp1pppp/8/8/2pP4/8/PP2PPPP/RNBQKBNR w' },
  { eco: 'D30', name: "Queen's Gambit Declined", fenPrefix: 'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w' },
  { eco: 'D10', name: 'Slav Defense', fenPrefix: 'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w' },
  { eco: 'D43', name: 'Semi-Slav Defense', fenPrefix: 'rnbqkb1r/pp3ppp/2p1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w' },

  // Indian Defenses (1. d4 Nf6)
  { eco: 'A45', name: 'Indian Defense', fenPrefix: 'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w' },
  { eco: 'E60', name: "King's Indian Defense", fenPrefix: 'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w' },
  { eco: 'E20', name: 'Nimzo-Indian Defense', fenPrefix: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w' },
  { eco: 'E00', name: 'Catalan Opening', fenPrefix: 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/6P1/PP2PP1P/RNBQKBNR b' },
  { eco: 'D70', name: 'Grünfeld Defense', fenPrefix: 'rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/8/PP2PPPP/RNBQKBNR w' },
  { eco: 'A56', name: 'Benoni Defense', fenPrefix: 'rnbqkb1r/pp1ppppp/5n2/2p5/2PP4/8/PP2PPPP/RNBQKBNR w' },
  { eco: 'A80', name: 'Dutch Defense', fenPrefix: 'rnbqkbnr/ppppp1pp/8/5p2/3P4/8/PPP1PPPP/RNBQKBNR w' },

  // Flank Openings
  { eco: 'A10', name: 'English Opening', fenPrefix: 'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b' },
  { eco: 'A04', name: 'Reti Opening', fenPrefix: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b' },
  { eco: 'A02', name: "Bird's Opening", fenPrefix: 'rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b' },
];

/**
 * Normalizes a FEN string to its piece placement and active turn (first two components)
 */
export function getFenPrefix(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0] || '';
}

/**
 * Look up opening by full FEN or prefix
 */
export function lookupOpening(fen: string): OpeningDefinition | null {
  const prefix = getFenPrefix(fen);
  for (const opening of OPENINGS) {
    if (opening.fenPrefix === prefix) {
      return opening;
    }
  }
  return null;
}
