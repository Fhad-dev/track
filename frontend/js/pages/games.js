(async function () {
  await NES.initShell('/pages/games.html');

  const grid = document.getElementById('games-grid');
  try {
    const { games } = await api.get('/games');
    if (games.length === 0) {
      grid.innerHTML = `<div class="state-block"><div class="icon">🎮</div><h3>No games yet</h3></div>`;
      return;
    }
    grid.innerHTML = games.map(renderGameCard).join('');
  } catch (err) {
    grid.innerHTML = `<div class="state-block"><div class="icon">⚠️</div><h3>Couldn't load games</h3><p>${NES.escapeHtml(err.message)}</p></div>`;
  }
})();
