import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  API_BASE,
  LEADERBOARD_PATH,
  buildPlayerStatsUrl,
  formatWinRate,
  isMockMode,
  normalizeLeaderboardPayload,
} from '../scripts/leaderboardCore.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const canonical = {
  updatedAt: '2026-08-30T12:00:00.000Z',
  minimumMatches: 3,
  winRate: [
    { name: 'A', wins: 9, losses: 1, matches: 10, winRate: 0.9, coins: 4 },
    { name: 'B', wins: 5, losses: 1, matches: 6, winRate: 5 / 6, coins: 8 },
  ],
  coins: [
    { name: 'B', wins: 5, losses: 1, matches: 6, winRate: 5 / 6, coins: 8 },
    { name: 'A', wins: 9, losses: 1, matches: 10, winRate: 0.9, coins: 4 },
  ],
};

test('production API is locked to one canonical endpoint', () => {
  assert.equal(API_BASE, 'https://api.sv13tcg.com');
  assert.equal(LEADERBOARD_PATH, '/leaderboard');
  const js = read('scripts/renderStats.js');
  assert.match(js, /fetch\(`\$\{API_BASE\}\$\{LEADERBOARD_PATH\}`/);
  for (const dead of ['/stats/leaderboard', '/duel/leaderboard', '/players/leaderboard', '/leaderboard/winloss', '/leaderboard/coins']) {
    assert.equal(js.includes(dead), false, `dead endpoint still present: ${dead}`);
  }
});

test('public mode does not require or attach a token to leaderboard fetches', () => {
  const js = read('scripts/renderStats.js');
  assert.equal(/fetch\([^\n]*token/i.test(js), false);
  assert.equal(js.includes('/me/'), false);
});

test('canonical payload keeps server ordering and minimum-match policy', () => {
  const out = normalizeLeaderboardPayload(canonical);
  assert.equal(out.minimumMatches, 3);
  assert.deepEqual(out.winRate.map((p) => p.name), ['A', 'B']);
  assert.deepEqual(out.coins.map((p) => p.name), ['B', 'A']);
});

test('known W/L values normalize and format as win rates', () => {
  const out = normalizeLeaderboardPayload(canonical);
  assert.equal(out.winRate[0].wins, 9);
  assert.equal(out.winRate[0].losses, 1);
  assert.equal(formatWinRate(out.winRate[0].winRate), '90.0%');
});

test('invalid or partial live payload is rejected instead of becoming demo data', () => {
  assert.throws(() => normalizeLeaderboardPayload(null));
  assert.throws(() => normalizeLeaderboardPayload({ winRate: [] }));
  assert.throws(() => normalizeLeaderboardPayload({ coins: [] }));
});

test('mock mode is explicit only', () => {
  assert.equal(isMockMode('?mock=1'), true);
  assert.equal(isMockMode('?mock=true'), false);
  assert.equal(isMockMode(''), false);
  const js = read('scripts/renderStats.js');
  assert.match(js, /mockMode\s*\?\s*await fetchMockLeaderboard\(\)\s*:\s*await fetchCanonicalLeaderboard\(\)/s);
});

test('legacy bundled demo player files are marked for deletion', () => {
  const manifest = read('_DELETE_FROM_REPO.txt');
  assert.match(manifest, /data\/player_data\.json/);
  assert.match(manifest, /data\/coin_bank\.json/);
});

test('viewer token is used only to build private Player Stats navigation', () => {
  const url = buildPlayerStatsUrl('viewer-token');
  assert.equal(url, 'https://stats.sv13tcg.com/?token=viewer-token');
  assert.equal(buildPlayerStatsUrl(''), null);
  const html = read('index.html');
  assert.match(html, /href="https:\/\/sv13tcg\.com"/);
});

test('failure UI explicitly says unavailable and refuses demo-player presentation', () => {
  const js = read('scripts/renderStats.js');
  assert.match(js, /Leaderboard service unavailable\. No demo players are being shown\./);
  assert.match(js, /Leaderboard unavailable\./);
});

test('labels use Win Rate rather than W/L ratio wording', () => {
  const html = read('index.html');
  assert.match(html, /Top 10 Win Rates/);
  assert.match(html, />Win Rate</);
  assert.equal(html.includes('Top 10 Win/Loss Ratios'), false);
  assert.equal(html.includes('W/L Ratio'), false);
});

test('refresh hooks cover visibility/focus and periodic live updates', () => {
  const js = read('scripts/renderStats.js');
  assert.match(js, /visibilitychange/);
  assert.match(js, /addEventListener\('focus'/);
  assert.match(js, /60_000/);
});


test('viewer identity is never persisted in localStorage', () => {
  const html = read('index.html');
  const js = read('scripts/renderStats.js');
  assert.equal(html.includes('sv13.token'), false);
  assert.equal(html.includes('sv13.api'), false);
  assert.equal(js.includes('sv13.token'), false);
  assert.equal(js.includes('sv13.api'), false);
});

test('custom domain contract is present', () => {
  assert.equal(read('CNAME').trim(), 'leaderboard.sv13tcg.com');
});
