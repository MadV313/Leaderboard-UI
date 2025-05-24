// scripts/renderStats.js

fetch('data/player_data.json')
  .then(res => res.json())
  .then(data => {
    const players = Object.entries(data).map(([id, player]) => ({
      id,
      ...player,
      ratio: (player.wins + player.losses) === 0 ? 0 : (player.wins / (player.wins + player.losses)),
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
    const wlBody = document.querySelector('#wlTable tbody');
    for (let i = 0; i < 10; i++) {
      const row = document.createElement('tr');
      const player = topRatio[i];
      if (player) {
        row.innerHTML = `
          <td>#${i + 1}</td>
          <td>${player.username || 'Unknown'}</td>
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
    const coinBody = document.querySelector('#coinTable tbody');
    for (let i = 0; i < 3; i++) {
      const row = document.createElement('tr');
      const player = topCoins[i];
      if (player) {
        row.innerHTML = `
          <td>#${i + 1}</td>
          <td>${player.username || 'Unknown'}</td>
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
  })
  .catch(err => {
    console.error('Failed to load leaderboard stats:', err);
  });
