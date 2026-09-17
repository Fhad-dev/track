(async function () {
  await NES.initShell('/pages/index.html');

  const grid = document.getElementById('games-grid');
  try {
    const { games } = await api.get('/games');
    if (games.length === 0) {
      grid.innerHTML = `<div class="state-block"><div class="icon">🎮</div><h3>No games yet</h3><p>Check back soon.</p></div>`;
      return;
    }
    grid.innerHTML = games.slice(0, 6).map(renderGameCard).join('');
  } catch (err) {
    grid.innerHTML = `<div class="state-block"><div class="icon">⚠️</div><h3>Couldn't load games</h3><p>${NES.escapeHtml(err.message)}</p></div>`;
  }
})();
