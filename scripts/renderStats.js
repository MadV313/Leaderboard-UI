import {
  API_BASE,
  LEADERBOARD_PATH,
  buildPlayerStatsUrl,
  cleanToken,
  formatUpdatedAt,
  formatWinRate,
  isMockMode,
  normalizeLeaderboardPayload,
} from './leaderboardCore.js';

const query = new URLSearchParams(window.location.search);
const viewerToken = cleanToken(query.get('token'));
const mockMode = isMockMode(window.location.search);

const statusPanel = document.getElementById('statusPanel');
const statusText = document.getElementById('statusText');
const retryButton = document.getElementById('retryButton');
const qualificationText = document.getElementById('qualificationText');
const updatedText = document.getElementById('updatedText');
const winRateBody = document.querySelector('#winRateTable tbody');
const coinBody = document.querySelector('#coinTable tbody');
const statsButton = document.getElementById('statsButton');
const statsHint = document.getElementById('statsHint');

let refreshInFlight = null;
let lastRefreshStartedAt = 0;

function setStatus(state, message, { retry = false } = {}) {
  statusPanel.dataset.state = state;
  statusText.textContent = message;
  retryButton.hidden = !retry;
}

function clearTable(body, columns, message) {
  body.replaceChildren();
  const row = document.createElement('tr');
  row.className = 'message-row';
  const cell = document.createElement('td');
  cell.colSpan = columns;
  cell.textContent = message;
  row.appendChild(cell);
  body.appendChild(row);
}

function appendCell(row, value) {
  const cell = document.createElement('td');
  cell.textContent = String(value);
  row.appendChild(cell);
}

function renderWinRateRows(rows) {
  winRateBody.replaceChildren();
  const top = rows.slice(0, 10);
  if (!top.length) {
    clearTable(winRateBody, 6, 'No qualified PvP players yet.');
    return;
  }

  top.forEach((player, index) => {
    const row = document.createElement('tr');
    appendCell(row, `#${index + 1}`);
    appendCell(row, player.name);
    appendCell(row, player.wins);
    appendCell(row, player.losses);
    appendCell(row, player.matches);
    appendCell(row, formatWinRate(player.winRate));
    winRateBody.appendChild(row);
  });
}

function renderCoinRows(rows) {
  coinBody.replaceChildren();
  const top = rows.slice(0, 3);
  if (!top.length) {
    clearTable(coinBody, 3, 'No coin rankings are available yet.');
    return;
  }

  top.forEach((player, index) => {
    const row = document.createElement('tr');
    appendCell(row, `#${index + 1}`);
    appendCell(row, player.name);
    appendCell(row, player.coins);
    coinBody.appendChild(row);
  });
}

function renderLeaderboard(data) {
  qualificationText.textContent = data.minimumMatches > 0
    ? `Minimum ${data.minimumMatches} competitive PvP matches required to qualify. Ties are resolved by the server.`
    : 'No minimum competitive PvP match requirement is currently configured. Ties are resolved by the server.';

  renderWinRateRows(data.winRate);
  renderCoinRows(data.coins);
  updatedText.textContent = `Last updated: ${formatUpdatedAt(data.updatedAt)}`;
}

async function fetchCanonicalLeaderboard() {
  const response = await fetch(`${API_BASE}${LEADERBOARD_PATH}`, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`leaderboard request failed (${response.status})`);
  }

  return normalizeLeaderboardPayload(await response.json());
}

async function fetchMockLeaderboard() {
  const response = await fetch(`data/mock_leaderboard.json?ts=${Date.now()}`, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) throw new Error('mock leaderboard unavailable');
  return normalizeLeaderboardPayload(await response.json());
}

async function refreshLeaderboard() {
  if (refreshInFlight) return refreshInFlight;

  const now = Date.now();
  if (now - lastRefreshStartedAt < 750) return;
  lastRefreshStartedAt = now;

  setStatus('loading', mockMode ? 'Loading developer mock leaderboard…' : 'Loading live leaderboard…');

  refreshInFlight = (async () => {
    try {
      const data = mockMode
        ? await fetchMockLeaderboard()
        : await fetchCanonicalLeaderboard();

      renderLeaderboard(data);
      setStatus(
        mockMode ? 'mock' : 'ok',
        mockMode ? 'Developer mock mode — not live data.' : 'Connected to SV13 TCG API.'
      );
    } catch (error) {
      console.error('[leaderboard] refresh failed:', error);
      clearTable(winRateBody, 6, 'Leaderboard unavailable.');
      clearTable(coinBody, 3, 'Leaderboard unavailable.');
      qualificationText.textContent = 'Qualification rules unavailable while the leaderboard service is offline.';
      updatedText.textContent = 'Last updated: unavailable';
      setStatus('error', 'Leaderboard service unavailable. No demo players are being shown.', { retry: true });
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function setupViewerNavigation() {
  const statsUrl = buildPlayerStatsUrl(viewerToken);
  if (!statsUrl) {
    statsButton.hidden = true;
    statsHint.hidden = false;
    return;
  }

  statsButton.href = statsUrl;
  statsButton.hidden = false;
  statsHint.hidden = true;
}

function setupRefreshHooks() {
  retryButton.addEventListener('click', () => refreshLeaderboard());

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshLeaderboard();
  });

  window.addEventListener('focus', () => refreshLeaderboard());
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) refreshLeaderboard();
  });

  window.setInterval(() => {
    if (!document.hidden) refreshLeaderboard();
  }, 60_000);
}

function setupMusic() {
  const audio = document.getElementById('leaderboard-bgm');
  const button = document.getElementById('audioToggle');
  if (!audio || !button) return;

  const preferenceKey = 'sv13.leaderboard.audioMuted';

  try {
    const saved = localStorage.getItem(preferenceKey);
    if (saved !== null) audio.muted = saved === 'true';
  } catch {}

  const updateButton = () => {
    button.textContent = audio.muted ? '🔇' : '🔊';
    button.setAttribute('aria-label', audio.muted ? 'Play background music' : 'Mute background music');
  };

  const tryPlay = () => audio.play().catch(() => {});
  updateButton();
  tryPlay();

  const unlock = () => {
    tryPlay();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);

  button.addEventListener('click', () => {
    audio.muted = !audio.muted;
    try {
      localStorage.setItem(preferenceKey, String(audio.muted));
    } catch {}
    updateButton();
    tryPlay();
  });
}

setupViewerNavigation();
setupRefreshHooks();
setupMusic();
refreshLeaderboard();
