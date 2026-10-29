import { Chess } from 'chess.js';
import openingsData from './openingsData.json';

/**
 * Comprehensive ECO Opening Book by FEN position prefix (piece placement + active turn)
 */
export interface OpeningDefinition {
  eco: string;
  name: string;
  fenPrefix: string;
}

const BASE_OPENINGS: OpeningDefinition[] = [
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
 * Full ECO opening lines — every intermediate ply along each line is indexed
 * so book detection never misses connecting moves or standard gambits.
 */
const OPENING_LINES: Array<[string, string, string]> = [
  // A00-A09 Flank & Uncommon 1st Moves
  ['A00', 'Nimzowitsch-Larsen Attack', 'b3'],
  ['A01', 'Nimzowitsch-Larsen Attack: Modern Variation', 'b3 e5 Bb2 Nc6 e3 Nf6 Bb5 Bd6 Ne2 O-O'],
  ['A01', 'Nimzowitsch-Larsen Attack: Modern Variation', 'b3 e5 Bb2 Nc6 Nf3 e4 Nd4 Nf6 Nxc6 dxc6'],
  ['A01', 'Nimzowitsch-Larsen Attack: Modern Variation', 'b3 e5 Bb2 Nc6 Nf3 e4 Nd4 Nf6 Nxc6 bxc6'],
  ['A01', 'Nimzowitsch-Larsen Attack: Classical Variation', 'b3 d5 Bb2 c5 e3 Nc6 Nf3 Nf6'],
  ['A01', 'Nimzowitsch-Larsen Attack: Indian Variation', 'b3 Nf6 Bb2 g6 e3 Bg7 Nf3 O-O'],
  ['A01', 'Nimzowitsch-Larsen Attack: Symmetrical Variation', 'b3 b6 Bb2 Bb7 e3 Nf6 Nf3 e6'],
  ['A00', 'Hungarian Opening', 'g3'],
  ['A00', 'Hungarian Opening: Reversed Modern', 'g3 e5 Bg2 d5 d3 Nf6 Nf3 Nc6 O-O'],
  ['A00', 'Hungarian Opening', 'g3 d5 Bg2 Nf6 Nf3 c6 O-O Bf5'],
  ['A00', 'Dunst Opening', 'Nc3'],
  ['A00', 'Dunst Opening', 'Nc3 d5 e4 d4 Nce2 e5 Ng3'],
  ['A00', 'Dunst Opening', 'Nc3 e5 Nf3 Nc6 d4 exd4 Nxd4'],
  ['A00', "Van 't Kruijs Opening", 'e3 e5 d4 exd4 exd4 d5 Nf3 Nf6'],
  ['A00', "Van 't Kruijs Opening", 'e3 d5 d4 Nf6 Nf3 e6 c4'],
  ['A00', 'Mieses Opening', 'd3 d5 Nd2 Nf6 e4 e5 Ngf3 Nc6'],
  ['A00', 'Mieses Opening', 'd3 e5 Nd2 d5 e4 Nf6 Ngf3 Nc6'],
  ['A00', 'Saragossa Opening', 'c3 e5 d4 exd4 cxd4 d5 Nc3 Nf6'],
  ['A00', 'Saragossa Opening', 'c3 d5 d4 Nf6 Bf4 c5 e3 Nc6'],
  ['A00', 'Sokolsky Opening', 'b4 e5 Bb2 Bxb4 Bxe5 Nf6 e3 O-O'],
  ['A00', "Anderssen's Opening", 'a3 e5 c4 Nf6 Nc3 d5 cxd5 Nxd5'],
  ['A02', "Bird's Opening", 'f4'],
  ['A02', "Bird's Opening: From's Gambit", 'f4 e5 fxe5 d6 exd6 Bxd6 Nf3 g5'],
  ['A03', "Bird's Opening: Dutch Variation", 'f4 d5 Nf3 Nf6 e3 g6 b3 Bg7 Bb2 O-O'],
  ['A04', 'Reti Opening', 'Nf3'],
  ['A04', 'Reti Opening', 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6'],
  ['A05', "King's Indian Attack", 'Nf3 Nf6 g3 d5 Bg2 c6 O-O Bf5 d3 e6 Nbd2'],
  ['A06', 'Reti Opening', 'Nf3 d5 g3 Nf6 Bg2 c6 O-O Bf5'],
  ['A07', "King's Indian Attack: Double Fianchetto", 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e5 d3 Nf6 Nbd2'],
  ['A09', 'Reti Opening: Advance Variation', 'Nf3 d5 c4 d4 b4 f6 e3 e5'],
  ['A09', 'Reti Opening: Accepted', 'Nf3 d5 c4 dxc4 e3 Nf6 Bxc4 e6 O-O c5'],

  // A10-A39 English Opening
  ['A10', 'English Opening', 'c4'],
  ['A10', 'English Opening: Anglo-Indian', 'c4 Nf6 Nc3 g6 g3 Bg7 Bg2 O-O Nf3 d6 O-O'],
  ['A13', 'English Opening: Agincourt Defense', 'c4 e6 Nc3 d5 d4 Nf6 Nf3 Be7 Bf4 O-O e3'],
  ['A15', 'English Opening: Anglo-Indian Defense', 'c4 Nf6 Nf3 g6 b3 Bg7 Bb2 O-O g3 d6 Bg2'],
  ['A16', 'English Opening: Anglo-Indian', 'c4 Nf6 Nc3 d5 cxd5 Nxd5 g3 g6 Bg2 Nb6 Nf3 Bg7'],
  ['A17', 'English Opening: Hedgehog', 'c4 Nf6 Nc3 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O'],
  ['A20', "English Opening: King's English Variation", 'c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6 Nf3 Nc6 O-O Be7'],
  ['A21', 'English Opening: Kramnik-Shirov Counterattack', 'c4 e5 Nc3 Bb4 Nd5 Bc5 Nf3 Nc6'],
  ['A22', 'English Opening: Two Knights Variation', 'c4 e5 Nc3 Nf6 Nf3 Nc6 e3 Bb4 Qc2 O-O'],
  ['A25', 'English Opening: Closed System', 'c4 e5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 e4'],
  ['A30', 'English Opening: Symmetrical Variation', 'c4 c5 Nf3 Nf6 Nc3 Nc6 g3 g6 Bg2 Bg7 O-O O-O'],
  ['A34', 'English Opening: Symmetrical', 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 Nf6 d4 cxd4 Nxd4'],

  // B00-B19 Semi-Open Games (1. e4)
  ['B00', "King's Pawn Game", 'e4'],
  ['B00', 'Nimzowitsch Defense', 'e4 Nc6 d4 d5 Nc3 dxe4 d5 Ne5 Bf4 Ng6'],
  ['B00', 'Nimzowitsch Defense: Williams Variation', 'e4 Nc6 Nf3 e5 Bc4 Bc5'],
  ['B00', "Owen's Defense", 'e4 b6 d4 Bb7 Bd3 e6 Nf3 Nf6 Nbd2 c5'],
  ['B00', 'St. George Defense', 'e4 a6 d4 b5 Nf3 Bb7 Bd3 e6'],
  ['B01', 'Scandinavian Defense', 'e4 d5'],
  ['B01', 'Scandinavian Defense: Main Line', 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6'],
  ['B01', 'Scandinavian Defense: Mieses-Kotrc Variation', 'e4 d5 exd5 Qxd5 Nc3 Qa5 Nf3 Nf6 d4 c6 Bc4 Bf5'],
  ['B01', 'Scandinavian Defense: Classical Variation', 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 c6 Ne5 Nbd7'],
  ['B01', 'Scandinavian Defense: Gubinsky-Melts Defense', 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4 Be2 e6'],
  ['B01', 'Scandinavian Defense: Modern Variation', 'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 c4 Nb6 Nc3 Bg7'],
  ['B01', 'Scandinavian Defense: Modern Variation', 'e4 d5 exd5 Nf6 Nc3 Nxd5 Bc4 Nb6 Bb3 Nc6 Nf3 Bf5'],
  ['B01', 'Scandinavian Defense: Marshall Variation', 'e4 d5 exd5 Nf6 Nc3 Nxd5 Nxd5 Qxd5 d4 Nc6 Nf3 Bg4 Be2'],
  ['B01', 'Scandinavian Defense: Marshall Variation', 'e4 d5 exd5 Nf6 Nc3 Nxd5 Nxd5 Qxd5 Nf3 Bf5 d4 Nc6'],
  ['B01', 'Scandinavian Defense: Panov Transfer', 'e4 d5 exd5 Nf6 Nc3 Nxd5 Nf3 Nxc3 bxc3 g6 d4 Bg7'],
  ['B01', 'Scandinavian Defense: Icelandic-Palme Gambit', 'e4 d5 exd5 Nf6 c4 e6 dxe6 Bxe6 d4 Bb4+'],
  ['B01', 'Scandinavian Defense: Blackburne-Kloosterboer Gambit', 'e4 d5 exd5 c6 dxc6 Nxc6 Nc3 e5'],
  ['B02', "Alekhine's Defense", 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6'],
  ['B02', "Alekhine's Defense: Scandinavian Variation", 'e4 Nf6 Nc3 d5 exd5 Nxd5 Bc4 e6 Nf3'],
  ['B03', "Alekhine's Defense: Four Pawns Attack", 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5'],
  ['B06', 'Modern Defense', 'e4 g6 d4 Bg7 Nc3 d6 Nf3 a6 Be2 b5 O-O Bb7'],
  ['B06', 'Modern Defense: Standard Line', 'e4 g6 d4 Bg7 Nc3 d6 f4 c6 Nf3 Bg4'],
  ['B07', 'Pirc Defense', 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4'],
  ['B07', 'Pirc Defense: Byrne Variation', 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 c6 f3 b5 Nge2 Nbd7 Bh6 Bxh6 Qxh6'],
  ['B08', 'Pirc Defense: Classical Variation', 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 h3 O-O Be3 c6 Bd3'],
  ['B09', 'Pirc Defense: Austrian Attack', 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5'],
  ['B10', 'Caro-Kann Defense', 'e4 c6'],
  ['B10', 'Caro-Kann Defense: Two Knights Attack', 'e4 c6 Nf3 d5 Nc3 Bg4 h3 Bxf3 Qxf3 e6 d4 Nf6'],
  ['B10', 'Caro-Kann Defense: Accelerated Panov', 'e4 c6 c4 d5 exd5 cxd5 cxd5 Nf6 Nc3 Nxd5'],
  ['B10', 'Caro-Kann Defense: Exchange / Breyer', 'e4 c6 Nf3 d5 exd5 cxd5 Bb5+ Nc6 O-O Bg4'],
  ['B12', 'Caro-Kann Defense: Advance Variation', 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Nc6 O-O'],
  ['B12', 'Caro-Kann Defense: Fantasy Variation', 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4'],
  ['B13', 'Caro-Kann Defense: Exchange Variation', 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3'],
  ['B14', 'Caro-Kann Defense: Panov-Botvinnik Attack', 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4 cxd5 Nxd5 Bd3'],
  ['B15', 'Caro-Kann Defense: Tartakower Variation', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O'],
  ['B18', 'Caro-Kann Defense: Classical Variation', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3'],
  ['B17', 'Caro-Kann Defense: Karpov Variation', 'e4 c6 d4 d5 Nd2 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 Bd3'],

  // B20-B99 Sicilian Defense
  ['B20', 'Sicilian Defense', 'e4 c5'],
  ['B20', 'Sicilian Defense: Bowdler Attack', 'e4 c5 Bc4 e6 Nc3 a6 a4 Nc6 Nf3 Nf6 O-O'],
  ['B20', 'Sicilian Defense: Bowdler Attack', 'e4 c5 Bc4 Nc6 Nf3 e6 d4 cxd4 Nxd4 Nf6 Nc3'],
  ['B21', 'Sicilian Defense: Smith-Morra Gambit', 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Nf6 Qe2'],
  ['B21', 'Sicilian Defense: Grand Prix Attack', 'e4 c5 f4 d5 exd5 Qxd5 Nc3 Qd8 Nf3 Nf6 Bb5+ Bd7'],
  ['B21', 'Sicilian Defense: McDonnell Attack', 'e4 c5 f4 Nc6 Nf3 g6 Bc4 Bg7 O-O d6 d3 e6'],
  ['B22', 'Sicilian Defense: Alapin Variation', 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4 Nb6 Bb5'],
  ['B22', 'Sicilian Defense: Alapin Variation', 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 e6 h3 Bh5 O-O Nc6'],
  ['B23', 'Sicilian Defense: Closed', 'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 f4 e6 Nf3 Nge7 O-O O-O'],
  ['B23', 'Sicilian Defense: Grand Prix Attack', 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bb5 Nd4 O-O Nxb5 Nxb5 d6'],
  ['B27', 'Sicilian Defense: Hyperaccelerated Dragon', 'e4 c5 Nf3 g6 d4 cxd4 Nxd4 Bg7 Nc3 Nc6 Be3 Nf6 Bc4 O-O'],
  ['B30', 'Sicilian Defense: Rossolimo Variation', 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 Nf6 c3 O-O d4 cxd4 cxd4 d5'],
  ['B31', 'Sicilian Defense: Rossolimo Variation', 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5'],
  ['B32', 'Sicilian Defense: Kalashnikov Variation', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5 Nb5 d6 c4 Be7 N1c3 a6 Na3'],
  ['B33', 'Sicilian Defense: Sveshnikov Variation', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5'],
  ['B35', 'Sicilian Defense: Accelerated Dragon', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6 Bc4 O-O Bb3'],
  ['B40', 'Sicilian Defense: French Variation', 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Ndb5 Bb4 a3 Bxc3+ Nxc3 d5'],
  ['B42', 'Sicilian Defense: Kan Variation', 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Bd3 Nf6 O-O Qc7 Qe2 d6 c4'],
  ['B46', 'Sicilian Defense: Taimanov Variation', 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 a6 Be3 Qc7 Qd2 Nf6 O-O-O'],
  ['B50', 'Sicilian Defense: Modern Variations', 'e4 c5 Nf3 d6 c3 Nf6 Be2 Nc6 d4 cxd4 cxd4 Nxe4 d5 Qa5+'],
  ['B51', 'Sicilian Defense: Moscow Variation', 'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 c4 Nc6 Nc3 Nf6 d4 cxd4 Nxd4'],
  ['B56', 'Sicilian Defense: Classical Variation', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Bg5 e6 Qd2 a6 O-O-O Bd7'],
  ['B70', 'Sicilian Defense: Dragon Variation', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O'],
  ['B80', 'Sicilian Defense: Scheveningen Variation', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6 Be2 Be7 O-O O-O f4 Nc6 Be3'],
  ['B90', 'Sicilian Defense: Najdorf Variation', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7'],
  ['B90', 'Sicilian Defense: Najdorf English Attack', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O'],

  // C00-C19 French Defense
  ['C00', 'French Defense', 'e4 e6'],
  ['C00', 'French Defense: Knight Variation', 'e4 e6 Nf3 d5 Nc3 Nf6 e5 Nfd7 d4 c5'],
  ['C01', 'French Defense: Exchange Variation', 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O c3 Bg4 Bg5 Nbd7'],
  ['C02', 'French Defense: Advance Variation', 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5'],
  ['C03', 'French Defense: Tarrasch Variation', 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cxd4 cxd4 f6'],
  ['C07', 'French Defense: Tarrasch Open Variation', 'e4 e6 d4 d5 Nd2 c5 exd5 Qxd5 Ngf3 cxd4 Bc4 Qd6 O-O Nf6 Nb3 Nc6'],
  ['C10', 'French Defense: Rubinstein Variation', 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 Bd3 c5 O-O'],
  ['C11', 'French Defense: Classical Variation', 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 O-O Nf3 c5'],
  ['C18', 'French Defense: Winawer Variation', 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Qxg7 Rg8'],

  // C20-C99 Open Games (1. e4 e5)
  ['C20', 'Open Game (1. e4 e5)', 'e4 e5'],
  ['C20', 'Wayward Queen Attack', 'e4 e5 Qh5 Nc6 Bc4 g6 Qf3 Nf6 Ne2 Bg7 Nbc3 O-O'],
  ['C20', 'Napoleon Opening', 'e4 e5 Qf3 Nc6 Bc4 Nf6 Ne2 Bc5 d3 d6'],
  ['C21', 'Center Game', 'e4 e5 d4 exd4 Qxd4 Nc6 Qe3 Nf6 Nc3 Bb4 Bd2 O-O'],
  ['C21', 'Danish Gambit', 'e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2 d5 Bxd5 Nf6 Bxf7+'],
  ['C23', "Bishop's Opening", 'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Bc5 c3 d6 O-O a6'],
  ['C23', "Bishop's Opening", 'e4 e5 Bc4 Nf6 d3 Nc6 a3 d5 exd5 Nxd5 Nf3'],
  ['C24', "Bishop's Opening: Berlin Defense", 'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5 Bb3 Bd6 Nc3 dxe4'],
  ['C24', "Bishop's Opening: Boi Variation", 'e4 e5 Bc4 Bc5 Nf3 Nc6 O-O Nf6 d3 d6'],
  ['C25', 'Vienna Game', 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nc6 Bb5'],
  ['C26', 'Vienna Game: Falkbeer Variation', 'e4 e5 Nc3 Nf6 Bc4 Bc5 d3 d6 f4 Nc6 Nf3'],
  ['C29', 'Vienna Gambit', 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Bg4 Qe2'],
  ['C30', "King's Gambit", 'e4 e5 f4'],
  ['C30', "King's Gambit Declined: Classical Variation", 'e4 e5 f4 Bc5 Nf3 d6 Nc3 Nf6 Bc4 Nc6 d3 Bg4'],
  ['C31', "King's Gambit: Falkbeer Countergambit", 'e4 e5 f4 d5 exd5 e4 d3 Nf6 dxe4 Nxe4 Nf3 Bc5'],
  ['C33', "King's Gambit Accepted", 'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6 Bc4 d5 exd5 Bd6'],
  ['C33', "King's Gambit Accepted: Bishop's Gambit", 'e4 e5 f4 exf4 Bc4 Qh4+ Kf1 d6 Nc3 Be6 Bb3'],
  ['C40', "King's Knight Opening", 'e4 e5 Nf3'],
  ['C40', 'Damiano Defense', 'e4 e5 Nf3 f6 Nxe5 fxe5 Qh5+ Ke7 Qxe5+ Kf7 Bc4+'],
  ['C40', 'Elephant Gambit', 'e4 e5 Nf3 d5 exd5 Bd6 Nc3 Nf6 Bb5+ c6'],
  ['C40', 'Latvian Gambit', 'e4 e5 Nf3 f5 Nxe5 Qf6 d4 d6 Nc4 fxe4 Nc3'],
  ['C41', 'Philidor Defense', 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O'],
  ['C41', 'Philidor Defense: Morphy Opera Game', 'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5'],
  ['C41', 'Philidor Defense: Lion / Hanham Variation', 'e4 e5 Nf3 d6 Bc4 Be7 d4 exd4 Nxd4 Nf6 Nc3 O-O O-O'],
  ['C41', 'Philidor Defense', 'e4 e5 Nf3 d6 Bc4 Nf6 Ng5 d5 exd5 h6'],
  ['C41', 'Philidor Defense', 'e4 e5 Nf3 d6 Bc4 Nf6 d3 Be7 O-O O-O Re1 c6'],
  ['C42', "Petrov's Defense", 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7 c4'],
  ['C42', "Petrov's Defense: Stafford Gambit", 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 h5'],
  ['C42', "Petrov's Defense: Three Knights Game", 'e4 e5 Nf3 Nf6 Nc3 Bb4 Nxe5 O-O Be2 Re8 Nd3 Bxc3'],
  ['C43', "Petrov's Defense: Modern Attack", 'e4 e5 Nf3 Nf6 d4 Nxe4 Bd3 d5 Nxe5 Nd7 Nxd7 Bxd7 O-O Bd6'],
  ['C44', "King's Pawn Game: Normal Variation", 'e4 e5 Nf3 Nc6'],
  ['C44', 'Ponziani Opening', 'e4 e5 Nf3 Nc6 c3 Nf6 d4 Nxe4 d5 Ne7 Nxe5 Ng6'],
  ['C44', 'Scotch Gambit', 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5 c3 Nf6 cxd4 Bb4+'],
  ['C45', 'Scotch Game', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O'],
  ['C45', 'Scotch Game: Classical Variation', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 Ne5'],
  ['C46', 'Three Knights Opening', 'e4 e5 Nf3 Nc6 Nc3 g6 d4 exd4 Nxd4 Bg7 Be3 Nf6'],
  ['C47', 'Four Knights Game: Scotch Variation', 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O'],
  ['C48', 'Four Knights Game: Spanish Variation', 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6 Bg5 Bxc3 bxc3'],
  ['C50', 'Italian Game', 'e4 e5 Nf3 Nc6 Bc4'],
  ['C50', 'Italian Game: Blackburne Shilling Gambit', 'e4 e5 Nf3 Nc6 Bc4 Nd4 O-O d6 Nxd4 exd4'],
  ['C50', 'Italian Game: Blackburne Shilling Gambit', 'e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5 Qg5 Nxf7 Qxg2 Rf1 Qxe4+ Be2 Nf3#'],
  ['C50', 'Italian Game: Hungarian Defense', 'e4 e5 Nf3 Nc6 Bc4 Be7 O-O Nf6 d4 d6 Nc3 O-O'],
  ['C50', 'Italian Game: Anti-Fried Liver Defense', 'e4 e5 Nf3 Nc6 Bc4 h6 O-O Nf6 d4 exd4 Nxd4'],
  ['C50', 'Italian Game: Giuoco Pianissimo', 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 Nc3 d6 Bg5 h6 Bh4 g5 Bg3'],
  ['C50', 'Italian Game: Giuoco Pianissimo', 'e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6 d3 d6 c3 a6 Re1 O-O'],
  ['C50', 'Italian Game: Giuoco Pianissimo', 'e4 e5 Nf3 Nc6 Bc4 Bc5 O-O h6 c3 Nf6 d4 exd4 cxd4 Bb6'],
  ['C51', 'Evans Gambit', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4 Bb6'],
  ['C53', 'Italian Game: Giuoco Piano', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 a6 O-O d6 Re1 O-O h3'],
  ['C54', 'Italian Game: Giuoco Piano Main Line', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5'],
  ['C55', 'Two Knights Defense', 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 a4 Na5 Ba2'],
  ['C55', "Two Knights Defense: Modern Bishop's Opening", 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5 Bxd5 Qxd5 Nc3'],
  ['C57', 'Two Knights Defense: Knight Attack', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4'],
  ['C57', 'Two Knights Defense: Fried Liver Attack', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3'],
  ['C57', 'Two Knights Defense: Traxler Counterattack', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 Nxf7 Bxf2+ Kf1 Qe7 Nxh8 d5'],
  ['C60', 'Ruy Lopez', 'e4 e5 Nf3 Nc6 Bb5'],
  ['C62', 'Ruy Lopez: Old Steinitz Defense', 'e4 e5 Nf3 Nc6 Bb5 d6 d4 Bd7 Nc3 Nf6 O-O Be7 Re1'],
  ['C65', 'Ruy Lopez: Berlin Defense', 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8'],
  ['C65', 'Ruy Lopez: Anti-Berlin', 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 c3 O-O O-O d6 Re1 a6 Ba4'],
  ['C68', 'Ruy Lopez: Exchange Variation', 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Ne2 Qxd1 Rxd1'],
  ['C70', 'Ruy Lopez: Morphy Defense', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O b5 Bb3 Bc5 c3 d6 d4 Bb6'],
  ['C78', 'Ruy Lopez: Archangelsk Variation', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O b5 Bb3 Bb7 d3 Bc5 c3 d6'],
  ['C84', 'Ruy Lopez: Closed', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7'],
  ['C89', 'Ruy Lopez: Marshall Attack', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6'],

  // D00-D99 Closed Games & Indian Defenses (1. d4)
  ['A40', "Queen's Pawn Game", 'd4'],
  ['A40', 'Englund Gambit', 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Nc3 Bb4'],
  ['A40', 'Englund Gambit: Hartlaub-Charlick Gambit', 'd4 e5 dxe5 d6 exd6 Bxd6 Nf3 Nf6'],
  ['A40', 'Englund Gambit: Declined', 'd4 e5 d5 Nf6 Nc3 Bc5 e4 d6 Nf3 O-O'],
  ['A40', 'Englund Gambit: Declined', 'd4 e5 d5 Nf6 Nc3 c6 e4 cxd5 exd5 Bb4'],
  ['A40', "Queen's Pawn Game: Modern Defense", 'd4 g6 c4 Bg7 Nc3 d6 e4 Nf6 Nf3 O-O Be2 e5'],
  ['A40', "Queen's Pawn Game: Horwitz Defense", 'd4 e6 c4 Nf6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5'],
  ['A41', "Queen's Pawn Game: Old Indian", 'd4 d6 c4 Nf6 Nc3 e5 Nf3 Nbd7 e4 Be7 Be2 O-O'],
  ['A43', 'Old Benoni Defense', 'd4 c5 d5 Nf6 Nc3 g6 e4 d6 Nf3 Bg7 Be2 O-O O-O'],
  ['A45', 'Indian Defense', 'd4 Nf6'],
  ['A45', 'Trompowsky Attack', 'd4 Nf6 Bg5 Ne4 Bf4 c5 f3 Qa5+ c3 Nf6 d5'],
  ['A45', 'Trompowsky Attack: Classical', 'd4 Nf6 Bg5 e6 e4 h6 Bxf6 Qxf6 Nf3 d6 Nc3'],
  ['A46', 'Indian Defense: Knights Variation', 'd4 Nf6 Nf3 e6 c3 b6 Bg5 Bb7 Nbd2 Be7 e3 O-O'],
  ['A48', "London System: King's Indian", 'd4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 d6 h3 c5 c3'],
  ['A48', 'Torre Attack', 'd4 Nf6 Nf3 g6 Bg5 Bg7 Nbd2 O-O c3 d6 e4'],
  ['A51', 'Budapest Gambit', 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7'],
  ['A56', 'Benoni Defense', 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 Nf3 Bg7 Be2 O-O'],
  ['A57', 'Benko Gambit', 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6'],
  ['A80', 'Dutch Defense', 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8'],
  ['A80', 'Dutch Defense: Hopton Attack', 'd4 f5 Bg5 h6 Bh4 g5 e4 Nf6 Bg3 d6'],
  ['A90', 'Dutch Defense: Stonewall', 'd4 f5 c4 Nf6 g3 e6 Bg2 d5 Nf3 c6 O-O Bd6 b3 Qe7'],
  ['D00', "Queen's Pawn Game: Closed", 'd4 d5'],
  ['D00', 'Blackmar-Diemer Gambit', 'd4 d5 e4 dxe4 Nc3 Nf6 f3 exf3 Nxf3 Bf5 Bc4 e6 O-O'],
  ['D01', 'Richter-Veresov Attack', 'd4 d5 Nc3 Nf6 Bg5 Nbd7 e3 e6 Nf3 Be7'],
  ['D01', 'Jobava London System', 'd4 d5 Nc3 Nf6 Bf4 c5 e3 cxd4 exd4 a6 Nf3 Nc6'],
  ['D01', 'Jobava London System', 'd4 Nf6 Nc3 d5 Bf4 e6 e3 Bd6 Qf3 O-O'],
  ['D02', 'London System', 'd4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6 Ngf3 Bd6 Bg3 O-O'],
  ['D02', 'London System', 'd4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O'],
  ['D02', 'London System: Bf5 Variation', 'd4 d5 Bf4 Bf5 e3 e6 Nf3 Nf6 c4 c6 Nc3 Bd6'],
  ['D04', 'Colle System', 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5 c3 Nc6 Nbd2 Bd6 O-O O-O'],
  ['D06', "Queen's Gambit", 'd4 d5 c4'],
  ['D07', "Queen's Gambit Declined: Chigorin Defense", 'd4 d5 c4 Nc6 Nf3 Bg4 cxd5 Bxf3 gxf3 Qxd5 e3 e5 Nc3 Bb4'],
  ['D08', "Queen's Gambit Declined: Albin Countergambit", 'd4 d5 c4 e5 dxe5 d4 Nf3 Nc6 g3 Be6 Nbd2 Qd7 Bg2'],
  ['D10', 'Slav Defense', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O O-O'],
  ['D12', 'Slav Defense: Quiet Variation', 'd4 d5 c4 c6 Nf3 Nf6 e3 Bf5 Nc3 e6 Nh4 Bg6 Nxg6 hxg6'],
  ['D13', 'Slav Defense: Exchange Variation', 'd4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6 Nf3 Nc6 Bf4 Bf5 e3 e6'],
  ['D20', "Queen's Gambit Accepted", 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3'],
  ['D21', "Queen's Gambit Accepted: Central Variation", 'd4 d5 c4 dxc4 e4 e5 Nf3 exd4 Bxc4 Nc6 O-O Be6'],
  ['D30', "Queen's Gambit Declined", 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6'],
  ['D35', "Queen's Gambit Declined: Exchange Variation", 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7 Qc2 Re8 Nf3 c6'],
  ['D37', "Queen's Gambit Declined: Three Knights", 'd4 d5 c4 e6 Nc3 Nf6 Nf3 Be7 Bf4 O-O e3 c5 dxc5 Bxc5'],
  ['D43', 'Semi-Slav Defense', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bxf6 Qxf6 e3 Nd7 Bd3 dxc4 Bxc4'],
  ['D45', 'Semi-Slav Defense: Main Line', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 a6 e4 c5'],
  ['D70', 'Grünfeld Defense', 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 Nc6 Be3 O-O O-O'],
  ['D90', 'Grünfeld Defense: Three Knights', 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 Bg4'],

  // E00-E99 Indian Defenses
  ['E00', 'Catalan Opening', 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6 Qxc4 b5'],
  ['E11', 'Bogo-Indian Defense', 'd4 Nf6 c4 e6 Nf3 Bb4+ Bd2 Qe7 g3 Nc6 Bg2 Bxd2+ Nbxd2 d6 O-O'],
  ['E12', "Queen's Indian Defense", 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4 Qc2 Nxc3 Qxc3'],
  ['E20', 'Nimzo-Indian Defense', 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O dxc4 Bxc4'],
  ['E32', 'Nimzo-Indian Defense: Classical Variation', 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7 e3 d6'],
  ['E60', "King's Indian Defense", 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7'],
  ['E62', "King's Indian Defense: Fianchetto Variation", 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6'],
  ['E80', "King's Indian Defense: Sämisch Variation", 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 Nh5 Qd2'],
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

const OPENING_MAP = new Map<string, OpeningDefinition>();
const BOARD_ONLY_MAP = new Map<string, OpeningDefinition>();

function buildOpeningBook(): void {
  if (OPENING_MAP.size > 0) return;

  // 1. Load 3,402 WintrCat/freechess ECO openings (keyed by piece placement or FEN prefix)
  for (const entry of openingsData as Array<{ name: string; fen: string }>) {
    const parts = entry.fen.trim().split(/\s+/);
    const boardPart = parts[0];
    if (!boardPart) continue;
    const def: OpeningDefinition = {
      eco: 'BOOK',
      name: entry.name,
      fenPrefix: parts.length >= 2 ? `${parts[0]} ${parts[1]}` : boardPart,
    };
    BOARD_ONLY_MAP.set(boardPart, def);
    if (parts.length >= 2) {
      OPENING_MAP.set(`${parts[0]} ${parts[1]}`, def);
    }
  }

  // 2. Load base opening definitions
  for (const op of BASE_OPENINGS) {
    OPENING_MAP.set(op.fenPrefix, op);
    const boardPart = op.fenPrefix.split(' ')[0];
    if (boardPart && !BOARD_ONLY_MAP.has(boardPart)) {
      BOARD_ONLY_MAP.set(boardPart, op);
    }
  }

  // 3. Load and index every intermediate ply along ECO lines
  for (const [eco, name, movesStr] of OPENING_LINES) {
    const chess = new Chess();
    const moves = movesStr.trim().split(/\s+/);
    for (let i = 0; i < moves.length; i++) {
      try {
        const moved = chess.move(moves[i]);
        if (!moved) break;
        const prefix = getFenPrefix(chess.fen());
        const boardPart = prefix.split(' ')[0];
        if (i === moves.length - 1 || !OPENING_MAP.has(prefix)) {
          const def = { eco, name, fenPrefix: prefix };
          OPENING_MAP.set(prefix, def);
          if (boardPart && !BOARD_ONLY_MAP.has(boardPart)) {
            BOARD_ONLY_MAP.set(boardPart, def);
          }
        }
      } catch {
        break;
      }
    }
  }
}

buildOpeningBook();

export const OPENINGS: OpeningDefinition[] = Array.from(OPENING_MAP.values());

/**
 * Look up opening by full FEN or prefix in O(1) time
 */
export function lookupOpening(fen: string): OpeningDefinition | null {
  buildOpeningBook();
  const prefix = getFenPrefix(fen);
  const exactMatch = OPENING_MAP.get(prefix);
  if (exactMatch) return exactMatch;

  const boardPart = fen.trim().split(/\s+/)[0] || '';
  return BOARD_ONLY_MAP.get(boardPart) || null;
}
