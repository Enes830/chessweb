# RewindBoard ♞

**RewindBoard** is a zero-ad, 100% client-side Chess Game Review web application powered by **Stockfish 19 WebAssembly**. It provides Stockfish move review, independent classifications, Lichess-based accuracy, sacrifice detection, 7,982 exact opening positions, English/Arabic support, coaching, and Telegram puzzle exports. Its scoring is not Chess.com CAPS or a calibrated Elo estimate.

---

## ✨ Key Features

- **100% Client-Side Engine (`Stockfish 19 Lite WASM`)**:
  - Runs `stockfish-19-lite-single.wasm` inside a dedicated browser Web Worker (`public/engine/stockfish.js` & `stockfish.wasm`).
  - Zero server compute required for engine analysis and no restrictive `COOP`/`COEP` headers needed.
  - Evaluates games with **MultiPV 3** at configurable depth (default depth 14) with same-root horizon correction.
- **Unified Omnibox Game Importer**:
  - **Chess.com Username**: Fetches public monthly archives and lists the 20 most recent games with win/loss badges, ratings, time controls, and 1-click analysis.
  - **Chess.com & Lichess Game URLs**: Server-side proxy (`/api/fetch-game`) resolves live/daily Chess.com games and Lichess game IDs/URLs without CORS issues.
  - **Raw PGN Tab**: Instant paste-and-analyze support with full PGN header parsing.
  - **Featured Masterpieces**: Built-in presets (*Morphy's Opera Game*, *Kasparov's Immortal*, *Tactical Comeback*).
- **Hybrid Move Classification Engine**:
  - Uses documented expected-loss bands and legal hanging-piece analysis with Static Exchange Evaluation (`SEE`).
  - **Brilliant (`!!`)**: Genuine material sacrifice verified via legal SEE (`exchangeGain`, `couldBeSaved`, `hasLastingOffer`) or unpinned hanging-piece viability where the move is top-tier and maintains a winning/equal position.
  - **Great (`!`)**: Critical only-move that turns a losing position into equal/winning or holds a narrow tactical edge over MultiPV #2 ($\ge 150\text{cp}$ spread).
  - **Best (`★`) / Excellent (`✓`) / Good**: Dynamic centipawn-loss thresholds scaled to previous evaluation magnitude.
  - **Book (`📖`)**: $O(1)$ exact legal-position lookup across **7,982 positions** from CC0 ECO opening lines, including intermediate plies.
  - **Inaccuracy (`?!`) / Mistake (`?`) / Blunder (`??`) / Missed Win (`❌`)**: Context-aware classification across centipawn and mate-transition states.
- **Interactive Review Dashboard**:
  - **Vertical Evaluation Bar**: Smooth win-percentage and mate-depth visualization.
  - **Board Overlay & SVG Arrows**: Green best-move arrows, played-move arrows, and classification badges rendered directly on target squares.
  - **Evaluation Graph**: Interactive Recharts area chart with color-coded blunder/brilliancy dots; click any point to jump to that ply.
  - **Coach Banner & AI/Heuristic Explainer**: Bilingual (`EN` / `AR`) tactical explanations generated deterministically on the client with optional OpenAI `gpt-4o-mini` enrichment via `/api/explain`.
- **Full English & Arabic (`RTL`) Localization**:
  - Instant language toggle (`en` / `ar`) with full RTL layout mirroring and localized chess terminology.
- **Companion Telegram Bot Sync**:
  - Automatically extracts blunders, mistakes, missed wins, and brilliancies into the `RewindPuzzlePayload` schema (`localStorage` persistence up to 200 puzzles).
  - Deep-links directly to the companion Telegram Bot (`https://t.me/RewindChessBot?start=...`) or dispatches JSON payloads to a configured webhook.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.18+ (tested on Node 20 / 22)
- **Package Manager**: `npm` or `pnpm`

### Installation

```bash
git clone <repo-url> rewindboard
cd rewindboard
npm install
```

> The `postinstall` script (`scripts/copy-stockfish.mjs`) automatically copies `stockfish-19-lite-single.js` and `stockfish-19-lite-single.wasm` from `node_modules/stockfish/bin/` into `public/engine/`.

### Environment Variables (Optional)

Create a `.env.local` file in the project root if you want optional AI explanations or custom Telegram Bot targets:

```env
# Optional: Enables GPT-4o-mini move explanations in /api/explain (falls back to local heuristic if omitted)
OPENAI_API_KEY=sk-...

# Optional: Custom Telegram Bot username & webhook for puzzle export
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=RewindChessBot
NEXT_PUBLIC_BOT_WEBHOOK_URL=https://your-bot-webhook.example.com/api/puzzles
```

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

## Analysis methodology

See [docs/analysis-methodology.md](docs/analysis-methodology.md) for formulas,
classification thresholds, engine behavior, sources and known limits.

Run `npm test` for deterministic analysis regressions and `npx tsc --noEmit`
for strict TypeScript validation. Refresh the CC0 opening database with
`node scripts/update-openings.mjs` (requires network access).

---

## 🗂️ Project Structure

```text
├── public/engine/               # Stockfish 19 Lite single-threaded WASM & JS worker
├── scripts/copy-stockfish.mjs   # Postinstall/build asset copier for Stockfish WASM
└── src/
    ├── app/
    │   ├── api/explain/         # Optional OpenAI GPT-4o-mini coach route
    │   ├── api/fetch-game/      # Server-side Chess.com & Lichess game resolver
    │   ├── layout.tsx           # Root layout & LanguageProvider wrapper
    │   └── page.tsx             # Main application state machine (import -> analyzing -> reviewed)
    ├── components/
    │   ├── ChessReviewBoard.tsx # Interactive chessboard, SVG move arrows & classification badges
    │   ├── CoachBanner.tsx      # Coach avatar, classification header & move explanation card
    │   ├── EvalBar.tsx          # Animated vertical evaluation bar
    │   ├── EvalGraph.tsx        # Recharts win-probability / centipawn area graph
    │   ├── GameImporter.tsx     # Omnibox importer (Chess.com user/URL, Lichess URL, PGN, Presets)
    │   ├── MoveList.tsx         # Two-column ply navigation table with symbols
    │   ├── ReviewSummary.tsx    # Accuracy cards & classification counts
    │   └── TelegramBridgeModal.tsx # Puzzle preview, JSON copy, webhook & Telegram deep link
    ├── lib/
    │   ├── bridge/telegramExport.ts # Puzzle extraction, localStorage & Telegram encoding
    │   ├── engine/
    │   │   ├── classifier.ts    # Expected-loss classifier, SEE & accuracy math
    │   │   └── workerClient.ts  # UCI Web Worker queue, MultiPV parser & perspective normalizer
    │   ├── i18n/                # Bilingual English/Arabic translations & LanguageContext
    │   ├── chesscom.ts          # Chess.com PubAPI fetcher, URL parsers & preset PGNs
    │   ├── coachExplainer.ts    # Deterministic bilingual tactical heuristics + API client
    │   ├── openings.ts          # O(1) FEN opening book builder & lookup
    │   └── openingsData.json    # 7,982 exact legal opening positions
    └── types/chess.ts           # Core TypeScript interfaces
```

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5.9
- **Styling**: Tailwind CSS 3.4, Lucide React
- **Chess Engine**: Stockfish 19 WebAssembly (`stockfish` npm package, single-threaded lite worker)
- **Chess Logic & Board**: `chess.js` (v1.4), `react-chessboard` (v5.12)
- **Visualizations**: Recharts 3.10
