// scripts/renderStats.js

async function loadLeaderboardData() {
  const statsRes = await fetch('/data/player_data.json');
  const coinsRes = await fetch('/data/coin_bank.json');

  const playerStats = await statsRes.json();
  const coinBank = await coinsRes.json();

  renderTopWinLoss(playerStats);
  renderTopCoins(coinBank);
}

function renderTopWinLoss(data) {
  const leaderboard = Object.entries(data)
    .map(([id, stats]) => ({
      username: stats.discordName,
      wins: stats.wins || 0,
      losses: stats.losses || 0,
      ratio: stats.losses === 0 ? stats.wins : (stats.wins / stats.losses).toFixed(2)
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 10);

  const tbody = document.querySelector('#wl-body');
  tbody.innerHTML = '';

  leaderboard.forEach((player, i) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${player.username}</td>
      <td>${player.wins}</td>
      <td>${player.losses}</td>
      <td>${player.ratio}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderTopCoins(data) {
  const leaderboard = Object.entries(data)
    .map(([id, coins]) => ({ userId: id, coins }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 3);

  const tbody = document.querySelector('#coin-body');
  tbody.innerHTML = '';

  leaderboard.forEach((entry, i) => {
    const playerName = entry.userId; // Fallback to ID; optional: enrich with names later
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${playerName}</td>
      <td>${entry.coins}</td>
    `;
    tbody.appendChild(row);
  });
}

// Auto-load on page open
document.addEventListener('DOMContentLoaded', loadLeaderboardData);
