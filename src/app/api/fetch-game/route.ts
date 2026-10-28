import { NextRequest, NextResponse } from 'next/server';
import { extractChessComId, extractLichessId, parsePgnToMetadata } from '@/lib/chesscom';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const urlOrId = (body.url || body.query || '').trim();

    if (!urlOrId) {
      return NextResponse.json({ error: 'Missing game URL or identifier' }, { status: 400 });
    }

    // 1. Handle Lichess Game URL or ID
    if (urlOrId.includes('lichess.org/') || (!urlOrId.includes('chess.com') && /^[A-Za-z0-9]{8}$/.test(urlOrId))) {
      const lichessId = extractLichessId(urlOrId);
      const lichessRes = await fetch(`https://lichess.org/game/export/${lichessId}?evals=0&clocks=1`, {
        headers: {
          Accept: 'application/x-chess-pgn',
          'User-Agent': 'RewindBoard-Chess-Review (support@rewindboard.com)',
        },
      });

      if (!lichessRes.ok) {
        return NextResponse.json(
          { error: `Could not fetch Lichess game with ID: ${lichessId}` },
          { status: lichessRes.status }
        );
      }

      const pgn = await lichessRes.text();
      if (!pgn || pgn.includes('Page not found') || pgn.trim().length === 0) {
        return NextResponse.json({ error: 'Lichess game was not found or is private' }, { status: 404 });
      }

      const metadata = parsePgnToMetadata(pgn, `https://lichess.org/${lichessId}`);
      return NextResponse.json({ pgn, metadata, source: 'lichess' });
    }

    // 2. Handle Chess.com Game URL
    if (urlOrId.includes('chess.com')) {
      const isDaily = urlOrId.includes('/daily/');
      const gameId = extractChessComId(urlOrId);

      const callbackUrl = isDaily
        ? `https://www.chess.com/callback/daily/game/${gameId}`
        : `https://www.chess.com/callback/live/game/${gameId}`;

      const cbRes = await fetch(callbackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
          Accept: 'application/json',
        },
      });

      if (!cbRes.ok) {
        return NextResponse.json(
          { error: `Could not load Chess.com game ${gameId}. Check if the URL is valid.` },
          { status: cbRes.status }
        );
      }

      const cbJson = await cbRes.json();
      const gameData = cbJson.game;
      if (!gameData) {
        return NextResponse.json({ error: 'Chess.com game data was empty.' }, { status: 404 });
      }

      // If PGN headers exist, fetch the official PGN from player's archive
      const pgnHeaders = gameData.pgnHeaders || {};
      const whiteUser = pgnHeaders.White;
      const gameDate = pgnHeaders.Date; // e.g. "2026.10.02"

      let officialPgn: string | null = null;

      if (whiteUser && gameDate && gameDate.includes('.')) {
        const [year, month] = gameDate.split('.');
        const paddedMonth = month.padStart(2, '0');
        try {
          const archiveUrl = `https://api.chess.com/pub/player/${encodeURIComponent(
            whiteUser.toLowerCase()
          )}/games/${year}/${paddedMonth}`;

          const archiveRes = await fetch(archiveUrl, {
            headers: {
              'User-Agent': 'RewindBoard-Chess-Review (support@rewindboard.com)',
            },
          });

          if (archiveRes.ok) {
            const archiveData = await archiveRes.json();
            const matchingGame = (archiveData.games || []).find((g: any) =>
              g.url?.includes(gameId)
            );
            if (matchingGame && matchingGame.pgn) {
              officialPgn = matchingGame.pgn;
            }
          }
        } catch (e) {
          console.warn('Failed to resolve from player archive:', e);
        }
      }

      if (!officialPgn) {
        // Fallback: If archive wasn't found or game is in-progress / unarchived yet
        // construct PGN header
        const headersStr = Object.entries(pgnHeaders)
          .map(([k, v]) => `[${k} "${v}"]`)
          .join('\n');
        return NextResponse.json(
          {
            error:
              'Game found on Chess.com, but its completed PGN is still processing in the public archives. Please paste the PGN directly or try another game.',
          },
          { status: 422 }
        );
      }

      const metadata = parsePgnToMetadata(officialPgn, urlOrId);
      return NextResponse.json({ pgn: officialPgn, metadata, source: 'chesscom' });
    }

    return NextResponse.json({ error: 'Unsupported URL or input format' }, { status: 400 });
  } catch (error: any) {
    console.error('Fetch game error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error resolving game' },
      { status: 500 }
    );
  }
}
