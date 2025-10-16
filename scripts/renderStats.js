// scripts/renderStats.js

// 📱 Ensure proper layout reset when returning from history navigation (especially on mobile)
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

// Normalize various possible payload shapes into a uniform array:
// [{ id, username, wins, losses, coins }]
function normalizePlayers(payload) {
  if (!payload) return [];

  // If it's already an array
  if (Array.isArray(payload)) {
    return payload.map((p, i) => ({
      id: p.id || p.userId || String(i),
      username: p.username || p.name || p.discordName || `Player ${i + 1}`,
      wins: Number(p.wins ?? p.duelsWon ?? 0),
      losses: Number(p.losses ?? p.duelsLost ?? 0),
      coins: Number(p.coins ?? p.balance ?? 0),
    }));
  }

  // If it's an object keyed by id (like player_data.json)
  const obj = payload.players || payload.data || payload;
  return Object.entries(obj).map(([id, p]) => ({
    id,
    username: p.username || p.name || p.discordName || `Player ${id}`,
    wins: Number(p.wins ?? p.duelsWon ?? 0),
    losses: Number(p.losses ?? p.duelsLost ?? 0),
    coins: Number(p.coins ?? p.balance ?? 0),
  }));
}

// Try backend endpoints first (via proxy/override), then fallback to local JSON
async function fetchLeaderboardData() {
  const endpoints = [
    "/leaderboard",               // preferred if you expose one
    "/stats/leaderboard",         // alt
    "/duel/leaderboard",          // alt
  ];

  // Attach token if present (some backends may scope stats by auth)
  const withToken = (path) => {
    const u = new URL(apiUrl(path), location.origin);
    if (TOKEN) u.searchParams.set("token", TOKEN);
    return u.toString();
  };

  // Probe API endpoints in order
  for (const path of endpoints) {
    try {
      const res = await fetch(withToken(path), { cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json().catch(() => null);
      if (!json) continue;
      const players = normalizePlayers(json);
      if (players.length) return players;
    } catch {
      // try next
    }
  }

  // Fallback: local JSON (static)
  try {
    const res = await fetch("data/player_data.json", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json().catch(() => null);
      const players = normalizePlayers(json);
      if (players.length) return players;
    }
  } catch {
    // swallow
  }

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
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 10);

  // Sort for Top 3 Coins
  const topCoins = [...players]
    .sort((a, b) => b.coins - a.coins)
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
        <td>${player.username || "Unknown"}</td>
        <td>${player.wins}</td>
        <td>${player.losses}</td>
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
        <td>${player.username || "Unknown"}</td>
        <td>${player.coins}</td>
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

(async function main() {
  try {
    const data = await fetchLeaderboardData();
    renderTables(data);
  } catch (err) {
    console.error("Failed to load leaderboard stats:", err);
    // Graceful empty render
    renderTables([]);
  }
})();
