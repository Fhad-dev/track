function renderGameCard(game) {
  const isComingSoon = game.status === 'coming_soon';
  const isDisabled = game.status === 'disabled';
  const accent = game.accent_color || '#C9A24A';

  if (isComingSoon) {
    return `
      <div class="game-card locked" style="--card-accent:${accent}">
        <div class="year">COMING SOON</div>
        <h3>${NES.escapeHtml(game.name.toUpperCase())}</h3>
        <div class="shortname">${NES.escapeHtml(game.short_name || '')}</div>
        <div class="lock-badge">🔒 TRACKER LOCKED</div>
        <p style="color:var(--muted); font-size:13px; margin:8px 0 0;">The tracker will unlock once game data is added.</p>
      </div>
    `;
  }

  return `
    <a href="/pages/game.html?slug=${encodeURIComponent(game.slug)}" class="game-card" style="--card-accent:${accent}${isDisabled ? ';opacity:0.5;pointer-events:none' : ''}">
      <div class="year">${game.release_year || ''}</div>
      <h3>${NES.escapeHtml(game.name.replace(/^Call of Duty:\s*/i, '').toUpperCase())}</h3>
      <div class="shortname">${NES.escapeHtml(game.short_name || '')}</div>
      <div class="btn btn-secondary" style="margin-top:8px;">Open Tracker</div>
    </a>
  `;
}
