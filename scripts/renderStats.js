// scripts/renderStats.js

// ───────────────────────────── Layout bootstrap ─────────────────────────────
// Ensure the page can scroll (some themes lock height); stretch bg on desktop.
(function ensureScrollableAndDesktopBG() {
  // allow page scrolling universally
  document.documentElement.style.overflowY = 'auto';
  document.body.style.overflowY = 'auto';

  // Desktop-only background behavior
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
  if (isDesktop) {
    // If the page uses a body background image, make it cover and fixed.
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundPosition = 'center center';
  }
})();

// 📱 Ensure proper layout reset when returning from history navigation (mobile)
window.addEventListener("pageshow", () => {
  window.scrollTo(0, 0);
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;

  // Optional: force visual repaint
  document.body.style.display = "none";
  requestAnimationFrame(() => {
    document.body.style.display = "";
  });
});

// ---- token / api (provided by index.html boot script)
const TOKEN = (window.PLAYER_TOKEN || "").trim();
const API_BASE = (window.API_BASE || "/api").replace(/\/+$/, "");

// Compose a URL against the API base
const apiUrl = (p = "") => `${API_BASE}${p.startsWith("/") ? p : `/${p}`}`;

// Helper: safe fetch → JSON (or null)
async function tryJson(url, opts) {
  try {
    const r = await fetch(url, { cache: "no-store", ...opts });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch {
    return null;
  }
}

// Normalize various possible payload shapes into a uniform array:
// [{ id, username, wins, losses, coins }]
function normalizePlayers(payload) {
  if (!payload) return [];

  // If it's already an array of players
  if (Array.isArray(payload)) {
    return payload.map((p, i) => ({
      id: p.id || p.userId || String(i),
      username: p.username || p.name || p.discordName || `Player ${i + 1}`,
      wins: Number(p.wins ?? p.duelsWon ?? 0),
      losses: Number(p.losses ?? p.duelsLost ?? 0),
      coins: Number(p.coins ?? p.balance ?? 0),
    }));
  }

  // If it's an object keyed by id (e.g., { "<userId>": {...} } or { players: {...} })
  const obj = payload.players || payload.data || payload;
  if (obj && typeof obj === "object") {
    return Object.entries(obj).map(([id, p]) => ([
      id,
      p || {}
    ])).map(([id, p]) => ({
      id,
      username: p.username || p.name || p.discordName || `Player ${id}`,
      wins: Number(p.wins ?? p.duelsWon ?? 0),
      losses: Number(p.losses ?? p.duelsLost ?? 0),
      coins: Number(p.coins ?? p.balance ?? 0),
    }));
  }

  return [];
}

// Merge two lists (e.g., W/L list and Coin list) by id
function mergePlayers(listA = [], listB = []) {
  const map = new Map();
  const upsert = (p) => {
    const id = String(p.id ?? p.userId ?? "");
    if (!id) return;
    const cur = map.get(id) || { id, username: p.username || p.name || p.discordName || `Player ${id}`, wins: 0, losses: 0, coins: 0 };
    map.set(id, {
      id,
      username: p.username || p.name || p.discordName || cur.username,
      wins: Number(p.wins ?? cur.wins ?? 0),
      losses: Number(p.losses ?? cur.losses ?? 0),
      coins: Number(p.coins ?? cur.coins ?? 0),
    });
  };
  listA.forEach(upsert);
  listB.forEach(upsert);
  return Array.from(map.values());
}

// Build URL with token (query form)
const withToken = (path) => {
  const u = new URL(apiUrl(path), location.origin);
  if (TOKEN) u.searchParams.set("token", TOKEN);
  return u.toString();
};

// Convenience for token-in-path endpoints: /me/:token/...
const withTokenPath = (pathPrefix) => {
  if (!TOKEN) return null;
  return apiUrl(`${pathPrefix.replace(/\/+$/, '')}/${encodeURIComponent(TOKEN)}/stats`);
};

// Try backend endpoints first (via API_BASE), then fallback to local JSON
async function fetchLeaderboardData() {
  // 0) New token-aware endpoints from your meToken API (preferred)
  //    We attempt global first, then token-scoped helpers.
  const preferredCandidates = [
    // Global combined leaderboards (if exposed)
    "/stats/leaderboard",
    "/leaderboard",
    "/duel/leaderboard",
    "/players/leaderboard",
  ];

  for (const path of preferredCandidates) {
    const json = await tryJson(withToken(path));
    const players = normalizePlayers(json);
    if (players.length) return players;
  }

  // Sometimes backends only expose token-scoped stats; we can still extract
  // coins for the caller and combine with global lists below.
  let selfStats = null;
  const tokenScoped = [
    withTokenPath("/me"),              // /me/:token/stats
    withToken("/me/stats"),            // /me/stats?token=...
    withToken("/players/me/stats"),    // alt
  ].filter(Boolean);

  for (const url of tokenScoped) {
    const json = await tryJson(url);
    if (json) { selfStats = json; break; }
  }

  // 1) Split endpoints: W/L list and Coins list (merge them)
  const wlCandidates = [
    "/leaderboard/winloss",
    "/stats/winloss",
    "/players/winloss",
    "/duels/winloss"
  ];
  const coinCandidates = [
    "/leaderboard/coins",
    "/stats/coins",
    "/players/coins",
    "/bank/top",
  ];

  let wl = [];
  for (const path of wlCandidates) {
    const json = await tryJson(withToken(path));
    const arr = normalizePlayers(json);
    if (arr.length) { wl = arr; break; }
  }

  let coin = [];
  for (const path of coinCandidates) {
    const json = await tryJson(withToken(path));
    const arr = normalizePlayers(json);
    if (arr.length) { coin = arr; break; }
  }

  // If we only have self stats with coins, inject them so the caller at least appears.
  if ((!wl.length || !coin.length) && selfStats) {
    const me = normalizePlayers([selfStats])[0];
    if (me) {
      if (!wl.length) wl = [me];
      if (!coin.length) coin = [me];
    }
  }

  if (wl.length || coin.length) {
    return mergePlayers(wl, coin);
  }

  // 2) Static JSON served by backend (common patterns)
  const staticCandidates = [
    "/data/player_data.json",
    "/public/data/player_data.json",
  ];
  for (const path of staticCandidates) {
    const json = await tryJson(apiUrl(path));
    const arr = normalizePlayers(json);
    if (arr.length) return arr;
  }

  // 3) Fallback: local JSON bundled in this UI (placeholder)
  const local = await tryJson("data/player_data.json");
  const localPlayers = normalizePlayers(local);
  if (localPlayers.length) return localPlayers;

  return [];
}

function renderTables(playersRaw) {
  const players = playersRaw.map((p) => ({
    ...p,
    ratio:
      (Number(p.wins) + Number(p.losses)) === 0
        ? 0
        : Number(p.wins) / (Number(p.wins) + Number(p.losses)),
  }));

  // Sort for Top 10 Win/Loss
  const topRatio = [...players]
    .sort((a, b) => b.ratio - a.ratio || b.wins - a.wins) // consistent tie-break
    .slice(0, 10);

  // Sort for Top 3 Coins
  const topCoins = [...players]
    .sort((a, b) => b.coins - a.coins || b.wins - a.wins) // tie-break
    .slice(0, 3);

  // Fill Win/Loss Table with 10 rows
  const wlBody = document.querySelector("#wlTable tbody");
  wlBody.innerHTML = "";
  for (let i = 0; i < 10; i++) {
    const row = document.createElement("tr");
    const player = topRatio[i];
    if (player) {
      row.innerHTML = `
        <td>#${i + 1}</td>
        <td>${escapeHtml(player.username || "Unknown")}</td>
        <td>${Number(player.wins)}</td>
        <td>${Number(player.losses)}</td>
        <td>${(player.ratio * 100).toFixed(1)}%</td>
      `;
    } else {
      row.innerHTML = `
        <td>#${i + 1}</td>
        <td>—</td>
        <td>—</td>
        <td>—</td>
        <td>—</td>
      `;
    }
    wlBody.appendChild(row);
  }

  // Fill Coin Table with 3 rows
  const coinBody = document.querySelector("#coinTable tbody");
  coinBody.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const row = document.createElement("tr");
    const player = topCoins[i];
    if (player) {
      row.innerHTML = `
        <td>#${i + 1}</td>
        <td>${escapeHtml(player.username || "Unknown")}</td>
        <td>${Number(player.coins)}</td>
      `;
    } else {
      row.innerHTML = `
        <td>#${i + 1}</td>
        <td>—</td>
        <td>—</td>
      `;
    }
    coinBody.appendChild(row);
  }
}

// Basic HTML escape for usernames
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function refreshOnce() {
  try {
    const data = await fetchLeaderboardData();
    renderTables(data);
  } catch (err) {
    console.error("Failed to load leaderboard stats:", err);
    renderTables([]);
  }
}

(async function main() {
  await refreshOnce();

  // 🔄 Light auto-refresh every 60s to keep “live” feel
  setInterval(refreshOnce, 60000);
})();
