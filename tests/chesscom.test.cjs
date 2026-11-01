require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchChessComUserGames } = require('../src/lib/chesscom.ts');

const base = 'https://api.chess.com/pub/player/enes_halit/games';
const game = (id) => ({
  url: `https://www.chess.com/game/live/${id}`,
  pgn: '[Result "1-0"]\n\n1. e4 e5 1-0',
  time_control: '600', end_time: id, rated: true,
  white: { username: 'enes_halit', rating: 1352, result: 'win' },
  black: { username: 'opponent', rating: 1300, result: 'resigned' },
});

function mockArchives(t, months) {
  const requested = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    requested.push(url);
    if (url === `${base}/archives`) {
      return Response.json({ archives: Object.keys(months).map(month => `${base}/${month}`) });
    }
    const data = months[url.slice(base.length + 1)];
    return data instanceof Response ? data : Response.json({ games: data });
  });
  return requested;
}

test('month rollover: empty November still returns the latest 20 October games', async (t) => {
  const requested = mockArchives(t, {
    '2026/09': [game(1)],
    '2026/10': Array.from({ length: 207 }, (_, i) => game(i + 2)),
    '2026/11': [],
  });
  const games = await fetchChessComUserGames('enes_halit');
  assert.equal(games.length, 20);
  assert.equal(games[0].id, '208');
  assert.equal(games[19].id, '189');
  assert.deepEqual(requested, [`${base}/archives`, `${base}/2026/11`, `${base}/2026/10`]);
});

test('fills a partial month from prior archives across a year boundary', async (t) => {
  mockArchives(t, { '2025/12': [game(1), game(2)], '2026/01': [game(3)] });
  assert.deepEqual((await fetchChessComUserGames('enes_halit')).map(g => g.id), ['3', '2', '1']);
});

test('returns empty only after checking all listed empty archives', async (t) => {
  const requested = mockArchives(t, { '2026/10': [], '2026/11': [] });
  assert.deepEqual(await fetchChessComUserGames('enes_halit'), []);
  assert.equal(requested.length, 3);
});

test('archive failures are surfaced rather than reported as no games', async (t) => {
  mockArchives(t, { '2026/10': new Response('', { status: 429 }), '2026/11': [] });
  await assert.rejects(fetchChessComUserGames('enes_halit'), /Failed to fetch recent games archive/);
});
