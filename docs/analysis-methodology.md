# RewindBoard analysis methodology

This is an independent Stockfish review system. It does not reproduce Chess.com's
private, rating-dependent expected-points model or CAPS score. Identical labels
and accuracy numbers across services are not guaranteed.

## Engine and positions

Game review uses Stockfish 19 Lite, single-threaded WebAssembly, depth 16,
MultiPV 3. Scores are normalized once to White's perspective. Chess.js PGN
history supplies before/after positions, including custom FEN starts and fullmove
numbers. Checkmate, stalemate, insufficient material and the fifty-move draw
condition are detected before searching. Initialization, search and cancellation
have 30-second, 120-second and 5-second failure deadlines respectively. Errors
reject pending work; a subsequent attempt creates a fresh worker. A stopped
search's final message is drained before another search starts.

## Move labels

A player-perspective win-chance proxy is `100 / (1 + exp(-0.00368208 * cp))`,
from Lichess's published formula. Forced mates map to 100 or 0 and terminal draws
to 50. Chess.com's published expected-point bands are applied to changes in this
proxy (percentage points): zero = Best; (0,2) = Excellent; [2,5) = Good;
[5,10) = Inaccuracy; [10,20) = Mistake; [20,100] = Blunder. The public table
shares endpoints; our explicit boundary convention assigns them to the worse band.

Exact UCI identity includes the promotion suffix. Same-root MultiPV scores may
reduce cross-ply horizon noise; the top engine choice has zero loss when there
is no terminal result or change in forced-mate status. This correction never
modifies the raw evaluations used by the graph, coaching and puzzle export.
Forced legal moves have zero loss because there was no alternative.

Book requires an exact legal position (placement, turn, castling, en-passant),
within the first 24 analyzed plies and under 2 percentage points of loss, without
entering a forced loss by mate. Unknown preceding positions are not backfilled.
The CC0 lichess-org/chess-openings source includes named bad openings too; a
name alone never overrides the quality check.

Brilliant requires a verified material sacrifice, under 2 points of loss, at
least 50% after the move, and an alternative below 95%. Forced moves, terminal
moves and promotions are excluded. Existing bounded SEE and legal capture
checks identify sacrifices. Great requires a Best move preserving at least 50%,
a gap of at least 20 points to the second candidate, and that alternative below
70%. Miss requires a preceding opponent Mistake/Blunder/Miss, a position at
least 70% before, at most 55% after, and at least 10 points lost. These special
thresholds are our explicit heuristics, not claimed Chess.com internals.

## Accuracy and rating

Move accuracy follows the public curve
`clamp(103.1668 * exp(-0.04354 * loss) - 3.1669, 0, 100)`, with 100 for zero loss.
Game accuracy averages the volatility-weighted mean and harmonic mean of a
player's move accuracies. Volatility uses sliding windows of White-perspective
win chances, with window size clamped to 2–8 and weights to 0.5–12. There are no
label bonuses, label penalties or artificial accuracy caps.

This is Lichess-based, not promised identical to Lichess: engine settings,
horizon corrections, mate handling and future formula updates can differ.
Uncalibrated performance Elo has been removed from the report and UI. A reliable
rating estimator requires outcome/rating data and validation; inventing another
accuracy-to-Elo mapping would not fix that limitation.

## Validation and limits

`npm test` covers controlled classifier inputs, promotion/draw regression,
custom PGN starts, exact opening identity, color symmetry, loss bands, accuracy
and worker lifecycle failures. These tests establish implementation invariants,
not agreement rates with a commercial service. Depth 16 can still miss tactics;
sacrifice detection remains heuristic. FEN-only engine searches do not retain
repetition history. Player-rating calibration, adaptive deeper verification and
large annotated-game benchmarks remain future work.

Sources checked October 30, 2026:

- https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc
- https://lichess.org/page/accuracy
- https://github.com/lichess-org/chess-openings (CC0; data generated October 30, 2026)
