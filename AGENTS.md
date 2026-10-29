# AGENTS.md — AI Coding Agent Guide for RewindBoard

This document provides architectural context, invariants, conventions, and workflows for AI coding agents working on **RewindBoard**. Read this file before making structural, engine, classification, or UI changes.

---

## 1. Project Overview

**RewindBoard** is a Next.js (App Router) + React 19 + TypeScript web application that performs 100% client-side chess game reviews using **Stockfish 19 WebAssembly**. Users can import games via Chess.com username, Chess.com/Lichess game URLs, raw PGN, or curated presets, and receive a full move-by-move breakdown (Brilliant `!!`, Great `!`, Best, Excellent, Good, Book, Inaccuracy `?!`, Mistake `?`, Blunder `??`, Missed Win), CAPS accuracy, estimated performance Elo, bilingual coaching explanations (`en` / `ar`), and exportable tactical puzzles for a companion Telegram Bot.

---

## 2. Commands & Workflow

- **Install dependencies**: `npm install` (triggers `postinstall` -> `node scripts/copy-stockfish.mjs`)
- **Start dev server**: `npm run dev`
- **Production build**: `npm run build` (copies Stockfish WASM to `public/engine/` then runs `next build`)
- **Lint**: `npm run lint`
- **Type-check**: `npx tsc --noEmit`

> **Important**: Whenever verifying code changes, run `npx tsc --noEmit` to ensure strict TypeScript compliance before concluding your task.

---

## 3. Architecture & Key Files

### State Machine (`src/app/page.tsx`)
The main page operates on a 3-stage state machine (`gameState`):
1. `'import'`: Renders `<GameImporter />` (Omnibox search, PGN textarea, or preset library).
2. `'analyzing'`: Replays the PGN via `chess.js`, builds an array of `N + 1` FEN positions (from initial board through final ply), and streams evaluations from `StockfishWorkerClient.evaluateGamePositions(fenList, 14, 3)`.
3. `'reviewed'`: Renders the interactive review dashboard (`<EvalBar />`, `<ChessReviewBoard />`, `<CoachBanner />`, `<ReviewSummary />`, `<EvalGraph />`, `<MoveList />`, and `<TelegramBridgeModal />`).

### Engine & UCI Web Worker (`src/lib/engine/workerClient.ts`)
- Instantiates `new Worker('/engine/stockfish.js#/engine/stockfish.wasm')`.
- **White-Perspective Normalization Invariant**: Stockfish UCI outputs `score cp` and `score mate` from the **side-to-move's perspective**. `StockfishWorkerClient.parseInfoLine` immediately negates `scoreCp` and `mate` whenever `fenTurn === 'b'`. **All `EngineEvalResult` scores returned by `workerClient.ts` are strictly from White's perspective** (`+` = White advantage, `-` = Black advantage). Do not invert them a second time for White.
- Terminal positions (checkmate, stalemate, draw) are short-circuited in `processNextTask()` using `chess.js` (`±10000` cp for checkmate, `0` for draw) so Stockfish is never queried on a position with zero legal moves.

### Move Classifier (`src/lib/engine/classifier.ts`)
- `classifyMove()` converts White-perspective evaluations (`evalBeforeWhite`, `evalAfterWhite`) into the **moving player's perspective** using `sign = turn === 'w' ? 1 : -1`.
- **Same-Root MultiPV Horizon Correction**: When a user's played move matches one of the top MultiPV lines from `evalBeforeObj.multiPVEvals`, `classifyMove()` compares same-root evaluation loss against cross-ply evaluation loss (`evalBefore` vs `evalAfter`) and uses the smaller loss. This prevents Stockfish odd/even ply horizon fluctuations from falsely penalizing top moves.
- **Sacrifice Detection (`isMaterialSacrifice`)**: Uses a dual-stage verification:
  1. Static Exchange Evaluation (`SEE`) ported from *Brilliant-Chess* (`exchangeGain`, `couldBeSaved`, `hasLastingOffer`) with node budgets to prevent UI freezes.
  2. *WintrCat/freechess* hanging piece & unpinned attacker capture viability (`isPieceHanging`, `getAttackers`, `getDefenders`).
- **Opening Book Backfilling**: In `src/app/page.tsx`, the deepest book match up to `ply <= 24` backfills earlier connecting moves (`forceBook: true`), while `classifier.ts` verifies `isSafeForBook` (`evalLoss <= 120` and not walking into forced mate) so opening blunders are never masked as `book`.

### Opening Book (`src/lib/openings.ts` & `src/lib/openingsData.json`)
- Combines `3,402` ECO FEN entries in `openingsData.json`, `BASE_OPENINGS`, and `OPENING_LINES` (which indexes every intermediate ply along major ECO variations).
- `lookupOpening(fen)` executes in $O(1)$ time via `OPENING_MAP` (`<board> <turn>`) and `BOARD_ONLY_MAP` (`<board>`).

### Coaching Explanations (`src/lib/coachExplainer.ts` & `src/app/api/explain/route.ts`)
- `generateHeuristicExplanation(move, locale)` synchronously creates deterministic tactical explanations in both English (`'en'`) and Arabic (`'ar'`).
- `getMoveExplanation(move, locale)` optionally calls `POST /api/explain` (if `OPENAI_API_KEY` is set on the server) and silently falls back to the local heuristic if unconfigured or offline.

### Internationalization (`src/lib/i18n/`)
- `translations.ts` defines the `TranslationDictionary` interface and full dictionaries for `en` and `ar`.
- `LanguageContext.tsx` provides `{ t, locale, setLocale, toggleLocale, dir, isRtl }`.
- **Rule for UI edits**: Any new user-facing string added to a component **must** be added to `TranslationDictionary` and both `en` and `ar` objects in `src/lib/i18n/translations.ts`. Keep RTL layout compatibility (`dir={dir}`, logical flex/grid alignment) intact.

### Game Fetching & Telegram Bridge
- `src/app/api/fetch-game/route.ts`: Resolves Lichess game URLs/IDs via `https://lichess.org/game/export/{id}` and Chess.com live/daily URLs via Chess.com callback + monthly public archive PGN lookup.
- `src/lib/bridge/telegramExport.ts`: Extracts `BLUNDER`, `MISTAKE`, `MISSED_WIN`, and `MISSED_BRILLIANT` moves into `RewindPuzzlePayload`, saves up to 200 items in `localStorage` (`rewind_puzzles`), and builds Telegram deep links (`https://t.me/{bot}?start=import_{base64}`).

---

## 4. Coding Conventions & Guardrails for Agents

1. **Path Aliases**: Always use `@/*` (mapped to `./src/*` in `tsconfig.json`) for internal imports.
2. **Client vs. Server Components**:
   - Interactive UI components and hooks (`useState`, `useEffect`, `useTranslation`) require `'use client';` at line 1.
   - Never import `workerClient.ts` inside server routes (`src/app/api/*`); `Worker` only exists in the browser.
3. **`chess.js` v1.4 API**:
   - When mutating or testing moves on a temporary `new Chess(fen)` instance, wrap `.move()` in `try { ... } catch { ... }` because `chess.js` v1.x throws an exception on illegal moves rather than returning `null`.
   - `board.attackers(square, color)` is natively supported in `chess.js` v1.4.0.
4. **Stockfish Binary Assets**:
   - Do not delete or hand-edit `public/engine/stockfish.js` or `public/engine/stockfish.wasm`. They are managed by `scripts/copy-stockfish.mjs`.
5. **Styling**:
   - The app uses a dark slate/emerald aesthetic (`bg-[#0a0d14]`, `bg-slate-900/70`, `border-slate-800/80`). Keep classification colors consistent with `CLASSIFICATION_META` in `src/lib/engine/classifier.ts`.

