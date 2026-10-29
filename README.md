# RewindBoard ♞

**RewindBoard** is a zero-ad, 100% client-side Chess Game Review web application powered by **Stockfish 19 WebAssembly**. It reproduces Chess.com's premium Game Review experience with move-by-move CAPS accuracy, brilliant sacrifices, tactical evaluations, interactive evaluation graphs, and seamless companion Telegram Bot training integration.

---

## ✨ Features

- **100% Client-Side Engine**:
  - Stockfish 19 lite single-threaded WASM (`public/engine/stockfish.js` & `stockfish.wasm`).
  - Runs in a dedicated Web Worker without freezing the UI.
  - Requires no server compute and no special COOP/COEP headers.
- **Unified Omnibox Input**:
  - **Chess.com Username**: Automatically fetches public archives and displays recent 20 games with win/loss badges, time controls, and instant "Analyze" buttons.
  - **Chess.com & Lichess Game URLs**: Automatically resolved server-side via `/api/fetch-game` proxy route to bypass CORS.
  - **Raw PGN Tab**: Instant paste-and-analyze support.
  - **Featured Masterpieces**: 1-click presets (Morphy Opera Game, Kasparov's Immortal, Tactical Comeback).
- **Chess.com-Style Move Classification**:
  - **Brilliant (!!)**: Engine top choice (or within 15cp), material sacrifice (hanging piece or trading down into mating attack), and significant separation from MultiPV 2.
  - **Great (!)**: Solitary move holding the position or narrow tactic.
  - **Best (★)** / **Excellent (✓)** / **Good**: Minimal or zero win probability loss.
  - **Book (📖)**: Matches top 50+ ECO openings via FEN lookup.
  - **Inaccuracy (?!)**: 5% – 9.9% win probability drop.
  - **Mistake (?)**: 10% – 19.9% win probability drop.
  - **Blunder (??)**: $\ge 20\%$ win probability drop.
  - **Missed Win (❌)**: Failing to punish an opponent's blunder or missing a decisive eval advantage.
- **Interactive Review Dashboard**:
  - **Vertical Evaluation Bar**: Smooth animated height transitions reflecting win probability and mate depth.
  - **SVG Arrows & Badges**: Green arrow for engine's best move, red/amber arrow for suboptimal moves, and official classification badge overlays on target squares.
  - **Evaluation Graph**: Responsive Recharts area chart with color-coded markers for blunders and brilliancies. Click any point to jump straight to that move.
  - **Coach Banner & "Explain Why"**: Move comparisons with tactical plain-English explanations.
- **Companion Telegram Bot Sync**:
  - Exports extracted mistakes and blunders into the `RewindPuzzlePayload` schema.
  - Automatically persists puzzles in `localStorage`.
  - Deep-links directly to companion Telegram Bot (`https://t.me/RewindChessBot?start=...`) or posts to a configured webhook.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (tested on Node 20 / 22)
- npm or pnpm

### Installation

```bash
git clone <repo-url> rewindboard
cd rewindboard
npm install
```

The `postinstall` script automatically verifies and copies the Stockfish 19 lite WASM binary into `public/engine/`.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

---

## 📐 Mathematical Model

### Centipawn to Win Probability

Evaluations are normalized from White's perspective and converted using the CAPS sigmoid formula:

$$\text{winPct} = 50 + 50 \times \left( \frac{2}{1 + e^{-0.00368208 \times \text{cp}}} - 1 \right)$$

### Move Accuracy & Loss

$$\text{winPctLoss} = \max(0, \text{winPct}_{\text{before}} - \text{winPct}_{\text{after}})$$

$$\text{Accuracy} = \max\left(0, \min\left(100, 103.1668 \times e^{-0.04354 \times \text{winPctLoss}} - 3.1669\right)\right)$$

### Performance Rating (Estimated Elo)

$$\text{Est. Elo} = \min\left(3000, \max\left(400, \text{round}\left(350 + 26.5 \times \text{OverallAccuracy}\right)\right)\right)$$

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Lucide React
- **Chess Engine**: Stockfish 19 WebAssembly (single-threaded lite worker)
- **Chess Logic & Board**: `chess.js` (v1.4), `react-chessboard` (v5)
- **Visualizations**: Recharts AreaChart, Canvas Confetti
