// scripts/renderStats.js

fetch('data/player_data.json')
  .then(res => res.json())
  .then(data => {
    const players = Object.entries(data).map(([id, player]) => ({
      id,
      ...player,
      ratio: (player.wins + player.losses) === 0 ? 0 : (player.wins / (player.wins + player.losses)),
    }));

    // Top 10 by Win/Loss Ratio
    const topRatio = [...players]
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 10);

    // Top 3 by Coins
    const topCoins = [...players]
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 3);

    // Populate Win/Loss Table
    const wlBody = document.querySelector('#wlTable tbody');
    topRatio.forEach((player, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>#${index + 1}</td>
        <td>${player.username || 'Unknown'}</td>
        <td>${player.wins}</td>
        <td>${player.losses}</td>
        <td>${(player.ratio * 100).toFixed(1)}%</td>
      `;
      wlBody.appendChild(row);
    });

    // Populate Coin Table
    const coinBody = document.querySelector('#coinTable tbody');
    topCoins.forEach((player, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>#${index + 1}</td>
        <td>${player.username || 'Unknown'}</td>
        <td>${player.coins}</td>
      `;
      coinBody.appendChild(row);
    });
  })
  .catch(err => {
    console.error('Failed to load leaderboard stats:', err);
  });
