(async function () {
  await NES.initShell(null);

  const slug = NES.qs('slug');
  const headerRoot = document.getElementById('game-header-root');
  const grid = document.getElementById('weapons-grid');
  const tabsEl = document.getElementById('section-tabs');
  const searchInput = document.getElementById('weapon-search');
  const categorySelect = document.getElementById('category-filter');

  if (!slug) {
    headerRoot.innerHTML = `<div class="state-block"><div class="icon">❓</div><h3>No game specified</h3><a href="/pages/games.html" class="btn btn-secondary">Browse Games</a></div>`;
    return;
  }

  let gameData, weaponCategories, masteryCategories;
  try {
    gameData = await api.get(`/games/${encodeURIComponent(slug)}`);
    weaponCategories = gameData.weaponCategories;
    masteryCategories = gameData.masteryCategories;
  } catch (err) {
    headerRoot.innerHTML = `<div class="state-block"><div class="icon">⚠️</div><h3>Game not found</h3><p>${NES.escapeHtml(err.message)}</p><a href="/pages/games.html" class="btn btn-secondary">Browse Games</a></div>`;
    return;
  }

  const game = gameData.game;
  document.title = `${game.name} — NES Camo Tracker`;
  document.documentElement.style.setProperty('--accent', game.accent_color || '#C9A24A');

  if (game.status === 'coming_soon') {
    headerRoot.innerHTML = `
      <div class="page-header">
        <div class="container">
          <div class="eyebrow">${game.release_year || ''}</div>
          <h1>${NES.escapeHtml(game.name.toUpperCase())}</h1>
          <div class="sub">COMING SOON</div>
        </div>
      </div>
      <div class="container">
        <div class="state-block">
          <div class="icon">🔒</div>
          <h3>Tracker Locked</h3>
          <p>The tracker will become available when the required game data is added.</p>
        </div>
      </div>
    `;
    document.getElementById('weapon-search').closest('.filters-bar').style.display = 'none';
    tabsEl.style.display = 'none';
    return;
  }

  headerRoot.innerHTML = `
    <div class="page-header" style="border-bottom-color: color-mix(in srgb, ${game.accent_color} 25%, var(--border));">
      <div class="container">
        <div class="eyebrow">${game.release_year || ''}</div>
        <h1>${NES.escapeHtml(game.name.toUpperCase())}</h1>
        <div class="sub" id="game-progress-sub">Loading progress…</div>
        <div class="mastery-chips" style="margin-top:14px;">
          ${masteryCategories.map((m) => `<span class="chip">${NES.escapeHtml(m.label)}</span>`).join('')}
        </div>
      </div>
    </div>
  `;

  // Populate category filter + tabs
  categorySelect.innerHTML = `<option value="">All Categories</option>` +
    weaponCategories.map((c) => `<option value="${c.key}">${NES.escapeHtml(c.label)}</option>`).join('');

  tabsEl.innerHTML = `<button class="tab-btn active" data-key="">All</button>` +
    weaponCategories.map((c) => `<button class="tab-btn" data-key="${c.key}">${NES.escapeHtml(c.label)}</button>`).join('');

  let currentCategory = '';
  let currentSearch = '';

  async function loadWeapons() {
    grid.innerHTML = `<div class="skeleton" style="height:150px;"></div><div class="skeleton" style="height:150px;"></div>`;
    try {
      const params = new URLSearchParams();
      if (currentCategory) params.set('category', currentCategory);
      if (currentSearch) params.set('search', currentSearch);
      const { weapons } = await api.get(`/games/${encodeURIComponent(slug)}/weapons?${params.toString()}`);

      if (weapons.length === 0) {
        grid.innerHTML = `<div class="state-block"><div class="icon">🔍</div><h3>No weapons found</h3><p>Try a different search or filter.</p></div>`;
        return;
      }

      grid.innerHTML = weapons.map((w) => `
        <a href="/pages/weapon.html?id=${w.id}" class="weapon-card">
          <div class="weapon-thumb">${w.image ? `<img src="${w.image}" alt="${NES.escapeHtml(w.name)}" onerror="this.parentElement.innerHTML='No Image'" />` : 'No Image'}</div>
          <div>
            <h4>${NES.escapeHtml(w.name)}</h4>
            <div class="cat">${NES.escapeHtml(w.category_label)}</div>
          </div>
          <div class="progress-row">
            <div class="progress-track"><div class="progress-fill" style="width:${w.completionPercent}%; background:${game.accent_color};"></div></div>
            <div class="pct">${w.completionPercent}%</div>
          </div>
        </a>
      `).join('');
    } catch (err) {
      grid.innerHTML = `<div class="state-block"><div class="icon">⚠️</div><h3>Couldn't load weapons</h3><p>${NES.escapeHtml(err.message)}</p></div>`;
    }
  }

  tabsEl.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      tabsEl.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.key;
      categorySelect.value = currentCategory;
      loadWeapons();
    });
  });
  categorySelect.addEventListener('change', () => {
    currentCategory = categorySelect.value;
    tabsEl.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.key === currentCategory));
    loadWeapons();
  });
  let debounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { currentSearch = searchInput.value.trim(); loadWeapons(); }, 250);
  });

  loadWeapons();

  // Overall progress for this game (only meaningful if logged in)
  if (NES.getUser()) {
    try {
      const summary = await api.get('/progress');
      const gameProgress = summary.perGame.find((g) => g.slug === slug);
      document.getElementById('game-progress-sub').textContent = gameProgress
        ? `${gameProgress.percent}% complete (${gameProgress.completed}/${gameProgress.total} challenges)`
        : 'No challenge data yet.';
    } catch {
      document.getElementById('game-progress-sub').textContent = '';
    }
  } else {
    document.getElementById('game-progress-sub').innerHTML = `<a href="/pages/login.html" style="color:var(--accent);">Log in</a> to track your progress on this game.`;
  }
})();
