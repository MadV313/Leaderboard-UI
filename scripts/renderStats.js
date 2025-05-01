// scripts/renderStats.js

const modal = document.getElementById('playerModal');
const modalContent = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

function openModal(contentHTML) {
  modalContent.innerHTML = contentHTML;
  modal.classList.add('show');
}

modalClose.onclick = () => modal.classList.remove('show');

window.onclick = (event) => {
  if (event.target == modal) {
    modal.classList.remove('show');
  }
};

fetch('data/player_data.json')
  .then(res => res.json())
  .then(data => {
    const players = Object.entries(data).map(([id, player]) => ({
      id,
      ...player,
      ratio: player.wins + player.losses === 0 ? 0 : player.wins / (player.wins + player.losses)
    }));

    // Sort top 10 by Win/Loss Ratio
    const topRatio = [...players]
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 10);

    // Sort top 3 by Coin Count
    const topCoins = [...players]
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 3);

    // Render Win/Loss Leaders
    const wlList = document.getElementById('wlLeaderboard');
    topRatio.forEach((player, index) => {
      const item = document.createElement('li');
      item.innerHTML = `
        <span class="rank">#${index + 1}</span>
        <span class="name clickable" data-id="${player.id}">${player.username}</span>
        <span class="stat">W/L: ${player.wins}/${player.losses} (${(player.ratio * 100).toFixed(1)}%)</span>
      `;
      wlList.appendChild(item);
    });

    // Render Coin Leaders
    const coinList = document.getElementById('coinLeaderboard');
    topCoins.forEach((player, index) => {
      const item = document.createElement('li');
      item.innerHTML = `
        <span class="rank">#${index + 1}</span>
        <span class="name clickable" data-id="${player.id}">${player.username}</span>
        <span class="stat">Coins: ${player.coins}</span>
      `;
      coinList.appendChild(item);
    });

    // Clickable usernames open modal
    document.querySelectorAll('.clickable').forEach(elem => {
      elem.addEventListener('click', () => {
        const id = elem.getAttribute('data-id');
        const p = data[id];
        const ratio = p.wins + p.losses === 0 ? 0 : (p.wins / (p.wins + p.losses)) * 100;
        openModal(`
          <h2>${p.username}</h2>
          <p><strong>Wins:</strong> ${p.wins}</p>
          <p><strong>Losses:</strong> ${p.losses}</p>
          <p><strong>Win Ratio:</strong> ${ratio.toFixed(1)}%</p>
          <p><strong>Coin Bank:</strong> ${p.coins}</p>
        `);
      });
    });
  })
  .catch(err => {
    console.error("Failed to load player data:", err);
  });
