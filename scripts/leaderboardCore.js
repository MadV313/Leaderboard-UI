export const API_BASE = 'https://api.sv13tcg.com';
export const LEADERBOARD_PATH = '/leaderboard';
export const HUB_URL = 'https://sv13tcg.com';
export const STATS_URL = 'https://stats.sv13tcg.com';

export function cleanToken(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function isMockMode(search = '') {
  try {
    const params = new URLSearchParams(search || '');
    return params.get('mock') === '1';
  } catch {
    return false;
  }
}

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nonNegativeInt(value) {
  return Math.max(0, Math.trunc(finiteNumber(value, 0)));
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return null;

  const name = String(row.name ?? row.username ?? row.discordName ?? '').trim();
  if (!name) return null;

  const wins = nonNegativeInt(row.wins);
  const losses = nonNegativeInt(row.losses);
  const calculatedMatches = wins + losses;
  const matches = nonNegativeInt(row.matches ?? calculatedMatches);
  const rawRate = finiteNumber(row.winRate, matches > 0 ? wins / matches : 0);
  const winRate = Math.min(1, Math.max(0, rawRate));
  const coins = nonNegativeInt(row.coins);

  return {
    name,
    wins,
    losses,
    matches,
    winRate,
    coins,
    provisional: Boolean(row.provisional),
  };
}

export function normalizeLeaderboardPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('invalid leaderboard payload');
  }

  if (!Array.isArray(payload.winRate) || !Array.isArray(payload.coins)) {
    throw new Error('leaderboard payload is missing ranking arrays');
  }

  const minimumMatches = Math.max(0, nonNegativeInt(payload.minimumMatches));
  const winRate = payload.winRate.map(normalizeRow).filter(Boolean);
  const coins = payload.coins.map(normalizeRow).filter(Boolean);
  const updatedAt = typeof payload.updatedAt === 'string' ? payload.updatedAt : '';

  return { updatedAt, minimumMatches, winRate, coins };
}

export function buildPlayerStatsUrl(token) {
  const cleaned = cleanToken(token);
  if (!cleaned) return null;
  const url = new URL(STATS_URL);
  url.searchParams.set('token', cleaned);
  return url.toString();
}

export function formatWinRate(value) {
  const rate = Math.min(1, Math.max(0, finiteNumber(value, 0)));
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatUpdatedAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}
