# RewindBoard ♞

**RewindBoard** is a zero-ad, 100% client-side Chess Game Review web application powered by **Stockfish 19 WebAssembly**. It reproduces Chess.com's premium Game Review experience with move-by-move CAPS accuracy, Static Exchange Evaluation (SEE) brilliant move detection, 3,400+ ECO opening book matching, bilingual English/Arabic (`RTL`) support, AI/heuristic coaching explanations, and companion Telegram Bot puzzle training integration.

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
  - Combines **WintrCat/freechess** quadratic centipawn loss curves and hanging-piece analysis with **Brilliant-Chess** Static Exchange Evaluation (`SEE`).
  - **Brilliant (`!!`)**: Genuine material sacrifice verified via legal SEE (`exchangeGain`, `couldBeSaved`, `hasLastingOffer`) or unpinned hanging-piece viability where the move is top-tier and maintains a winning/equal position.
  - **Great (`!`)**: Critical only-move that turns a losing position into equal/winning or holds a narrow tactical edge over MultiPV #2 ($\ge 150\text{cp}$ spread).
  - **Best (`★`) / Excellent (`✓`) / Good**: Dynamic centipawn-loss thresholds scaled to previous evaluation magnitude.
  - **Book (`📖`)**: $O(1)$ FEN prefix & board-placement lookup across **3,400+ ECO openings** (`openingsData.json`) plus full intermediate ply indexing.
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

## 📐 Mathematical & Classification Model

### 1. Centipawn to Win Probability

Evaluations are normalized from White's perspective and converted using the standard Lichess/CAPS sigmoid formula:

$$\text{winPct}(\text{cp}) = 50 + 50 \times \left( \frac{2}{1 + e^{-0.00368208 \times \text{cp}}} - 1 \right)$$

### 2. Move Accuracy & Player Rating

Move accuracy combines CAPS exponential win-percentage loss with classification weights:

$$\text{CAPS}_{\text{move}} = \max\left(0, \min\left(100, 103.1668 \times e^{-0.04354 \times \text{winPctLoss}} - 3.1669\right)\right)$$

$$\text{Accuracy}_{\text{player}} = \frac{1}{N} \sum_{i=1}^{N} \left(0.7 \times \text{CAPS}_i + 0.3 \times \text{Weight}_i \times 100\right)$$

$$\text{Est. Elo} = \text{ clamp}_{[400, 3000]}\left(\text{round}_{50}\left(350 + 26.5 \times \text{Accuracy}_{\text{player}}\right)\right)$$

### 3. Dynamic Evaluation Loss Curves

Permissible centipawn loss scales quadratically with the magnitude of the previous evaluation $|\text{eval}_{\text{prev}}|$:

- **Best**: $0.0001 x^2 + 0.0236 x - 3.7143$
- **Excellent**: $0.0002 x^2 + 0.1231 x + 27.5455$
- **Good**: $0.0002 x^2 + 0.2643 x + 60.5455$
- **Inaccuracy**: $0.0002 x^2 + 0.3624 x + 108.0909$
- **Mistake**: $0.0003 x^2 + 0.4027 x + 225.8182$

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
    │   ├── ReviewSummary.tsx    # Accuracy cards, Elo estimates & classification counts
    │   └── TelegramBridgeModal.tsx # Puzzle preview, JSON copy, webhook & Telegram deep link
    ├── lib/
    │   ├── bridge/telegramExport.ts # Puzzle extraction, localStorage & Telegram encoding
    │   ├── engine/
    │   │   ├── classifier.ts    # Hybrid SEE + WintrCat move classifier & accuracy math
    │   │   └── workerClient.ts  # UCI Web Worker queue, MultiPV parser & perspective normalizer
    │   ├── i18n/                # Bilingual English/Arabic translations & LanguageContext
    │   ├── chesscom.ts          # Chess.com PubAPI fetcher, URL parsers & preset PGNs
    │   ├── coachExplainer.ts    # Deterministic bilingual tactical heuristics + API client
    │   ├── openings.ts          # O(1) FEN opening book builder & lookup
    │   └── openingsData.json    # 3,402 ECO openings dataset
    └── types/chess.ts           # Core TypeScript interfaces
```

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5.9
- **Styling**: Tailwind CSS 3.4, Lucide React
- **Chess Engine**: Stockfish 19 WebAssembly (`stockfish` npm package, single-threaded lite worker)
- **Chess Logic & Board**: `chess.js` (v1.4), `react-chessboard` (v5.12)
- **Visualizations**: Recharts 3.10
