const leaderboard = document.getElementById('leaderboard');
const coinLeaders = document.getElementById('coinLeaders');
const modal = document.getElementById('playerModal');
const modalTitle = document.getElementById('modalTitle');
const modalWins = document.getElementById('modalWins');
const modalLosses = document.getElementById('modalLosses');
const modalRatio = document.getElementById('modalRatio');
const modalCoins = document.getElementById('modalCoins');
const closeBtn = document.querySelector('.close');

fetch('/data/player_data.json')
  .then(res => res.json())
  .then(data => {
    const players = Object.entries(data);

    const withRatios = players.map(([id, p]) => ({
      id,
      name: p.discordName || `User ${id}`,
      wins: p.wins || 0,
      losses: p.losses || 0,
      coins: p.coins || 0,
      ratio: p.losses ? (p.wins / p.losses).toFixed(2) : p.wins
    }));

    // Top 10 W/L
    withRatios.sort((a, b) => b.ratio - a.ratio);
    withRatios.slice(0, 10).forEach(p => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${p.name}</strong> — W: ${p.wins}, L: ${p.losses}, Ratio: ${p.ratio}`;
      li.onclick = () => openModal(p);
      leaderboard.appendChild(li);
    });

    // Top 3 Coins
    withRatios.sort((a, b) => b.coins - a.coins);
    withRatios.slice(0, 3).forEach(p => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${p.name}</strong> — ${p.coins} coins`;
      li.onclick = () => openModal(p);
      coinLeaders.appendChild(li);
    });
  });

function openModal(player) {
  modal.classList.remove('hidden');
  modalTitle.textContent = `${player.name}'s Stats`;
  modalWins.textContent = `Wins: ${player.wins}`;
  modalLosses.textContent = `Losses: ${player.losses}`;
  modalRatio.textContent = `Win/Loss Ratio: ${player.ratio}`;
  modalCoins.textContent = `Banked Coins: ${player.coins}`;
}

closeBtn.onclick = () => modal.classList.add('hidden');
window.onclick = e => {
  if (e.target === modal) modal.classList.add('hidden');
};
