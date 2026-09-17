(async function () {
  await NES.initShell('/pages/tracker.html');
  const root = document.getElementById('tracker-root');

  if (!NES.getUser()) {
    root.innerHTML = `
      <div class="state-block">
        <div class="icon">🔒</div>
        <h3>Log in to see your tracker</h3>
        <p>Your camo progress is saved to the cloud once you're signed in.</p>
        <a href="/pages/login.html" class="btn btn-primary" style="margin-top:12px;">Log In</a>
      </div>
    `;
    return;
  }

  try {
    const summary = await api.get('/progress');

    root.innerHTML = `
      <div class="card" style="margin-top:24px;">
        <div style="display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:10px;">
          <h2 style="margin:0;">Overall Completion</h2>
          <span style="font-size:28px; font-weight:800;">${summary.overallPercent}%</span>
        </div>
        <div class="progress-track" style="margin-top:14px;"><div class="progress-fill" style="width:${summary.overallPercent}%;"></div></div>
        <div style="display:flex; gap:28px; margin-top:20px; flex-wrap:wrap;">
          <div><div style="color:var(--muted); font-size:12px;">Challenges Completed</div><div style="font-size:20px; font-weight:700;">${summary.overallCompleted} / ${summary.overallTotal}</div></div>
          <div><div style="color:var(--muted); font-size:12px;">Games Completed</div><div style="font-size:20px; font-weight:700;">${summary.gamesCompletedCount} / ${summary.gamesTotalCount}</div></div>
          <div><div style="color:var(--muted); font-size:12px;">Weapons Mastered</div><div style="font-size:20px; font-weight:700;">${summary.weaponsCompleted}</div></div>
        </div>
      </div>

      <div class="section-title">By Game</div>
      <div class="card" style="display:flex; flex-direction:column; gap:16px;">
        ${summary.perGame.map((g) => `
          <div class="progress-row">
            <div class="label">${NES.escapeHtml(g.name.replace(/^Call of Duty:\s*/i, ''))}</div>
            <div class="progress-track"><div class="progress-fill" style="width:${g.percent}%; background:${g.accentColor};"></div></div>
            <div class="pct">${g.percent}%</div>
            <a href="/pages/game.html?slug=${g.slug}" class="btn btn-ghost" style="text-transform:none;">Open</a>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    root.innerHTML = `<div class="state-block"><div class="icon">⚠️</div><h3>Couldn't load your progress</h3><p>${NES.escapeHtml(err.message)}</p></div>`;
  }
})();
