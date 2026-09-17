(async function () {
  await NES.initShell(null);

  const id = NES.qs('id');
  const headerRoot = document.getElementById('weapon-header-root');
  const tabsRoot = document.getElementById('camo-type-tabs');
  const challengesRoot = document.getElementById('challenges-root');

  if (!id) {
    headerRoot.innerHTML = `<div class="state-block"><div class="icon">❓</div><h3>No weapon specified</h3></div>`;
    return;
  }

  let data;
  try {
    data = await api.get(`/weapons/${id}`);
  } catch (err) {
    headerRoot.innerHTML = `<div class="state-block"><div class="icon">⚠️</div><h3>${err.status === 404 ? 'Weapon not found' : "Couldn't load weapon"}</h3><p>${NES.escapeHtml(err.message)}</p><a href="/pages/games.html" class="btn btn-secondary">Browse Games</a></div>`;
    return;
  }

  const { weapon, challenges, masteryCamos } = data;
  document.title = `${weapon.name} — NES Camo Tracker`;
  document.documentElement.style.setProperty('--accent', weapon.accent_color || '#C9A24A');

  function renderHeader() {
    const totalChallenges = challenges.length;
    const completedChallenges = challenges.filter((c) => c.completed).length;
    const pct = totalChallenges > 0 ? Math.round((completedChallenges / totalChallenges) * 100) : 0;

    headerRoot.innerHTML = `
      <div class="page-header">
        <div class="container">
          <div class="eyebrow"><a href="/pages/game.html?slug=${weapon.game_slug}" style="color:var(--muted);">${NES.escapeHtml(weapon.game_name)}</a> · ${NES.escapeHtml(weapon.category_label)}</div>
          <h1>${NES.escapeHtml(weapon.name.toUpperCase())}</h1>
          <div class="progress-row" style="max-width:420px; margin-top:16px;">
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
            <div class="pct">${pct}%</div>
          </div>
        </div>
      </div>
    `;
  }

  function groupKey(group) {
    return group === 'mastery' ? 'mastery' : group;
  }

  const groups = [
    { key: 'base', label: 'Base Camos', items: challenges.filter((c) => c.category === 'base') },
    { key: 'special', label: 'Special Camos', items: challenges.filter((c) => c.category !== 'base') },
    { key: 'mastery', label: 'Mastery', items: masteryCamos },
  ].filter((g) => g.items.length > 0);

  let activeGroup = groups[0] ? groups[0].key : null;

  function renderTabs() {
    tabsRoot.innerHTML = groups.map((g) => `
      <button class="tab-btn ${g.key === activeGroup ? 'active' : ''}" data-key="${g.key}">${g.label}</button>
    `).join('');
    tabsRoot.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeGroup = btn.dataset.key;
        renderTabs();
        renderChallenges();
      });
    });
  }

  async function toggleChallenge(challengeId, completed) {
    const challenge = challenges.find((c) => c.id === challengeId);
    const original = challenge.completed;
    challenge.completed = !original; // optimistic
    renderHeader();
    renderChallenges();
    try {
      if (challenge.completed) {
        await api.post('/progress', { challengeId });
      } else {
        await api.del(`/progress/challenge/${challengeId}`);
      }
    } catch (err) {
      challenge.completed = original; // revert on failure
      renderHeader();
      renderChallenges();
      if (err.status === 401) {
        NES.toast('Log in to track your progress.', 'error');
      } else {
        NES.toast(err.message, 'error');
      }
    }
  }

  async function toggleMastery(masteryId) {
    const camo = masteryCamos.find((m) => m.id === masteryId);
    const original = camo.completed;
    camo.completed = !original;
    renderChallenges();
    try {
      if (camo.completed) {
        await api.post('/progress', { masteryCamoId: masteryId });
      } else {
        await api.del(`/progress/mastery/${masteryId}`);
      }
    } catch (err) {
      camo.completed = original;
      renderChallenges();
      if (err.status === 401) NES.toast('Log in to track your progress.', 'error');
      else NES.toast(err.message, 'error');
    }
  }

  function renderChallenges() {
    const group = groups.find((g) => g.key === activeGroup);
    if (!group) {
      challengesRoot.innerHTML = `<div class="state-block"><div class="icon">📭</div><h3>No challenge data yet</h3><p>Check back once this weapon's camo data has been added.</p></div>`;
      return;
    }

    if (group.key === 'mastery') {
      challengesRoot.innerHTML = `<div style="display:flex; flex-direction:column; gap:10px;">` + group.items.map((m) => `
        <div class="challenge-row ${m.completed ? 'completed' : ''}" data-mastery="${m.id}">
          <div class="checkmark">${m.completed ? '✓' : ''}</div>
          <div class="challenge-info">
            <div class="name">${NES.escapeHtml(m.category_label)}</div>
            <div class="req">${NES.escapeHtml(m.requirement)}</div>
          </div>
        </div>
      `).join('') + `</div>`;
      challengesRoot.querySelectorAll('[data-mastery]').forEach((row) => {
        row.addEventListener('click', () => toggleMastery(row.dataset.mastery));
      });
      return;
    }

    challengesRoot.innerHTML = `<div style="display:flex; flex-direction:column; gap:10px;">` + group.items.map((c) => `
      <div class="challenge-row ${c.completed ? 'completed' : ''}" data-challenge="${c.id}">
        <div class="checkmark">${c.completed ? '✓' : ''}</div>
        <div class="challenge-thumb">${c.image ? `<img src="${c.image}" alt="" onerror="this.parentElement.style.display='none'" />` : ''}</div>
        <div class="challenge-info">
          <div class="name">${NES.escapeHtml(c.name)}</div>
          <div class="req">${NES.escapeHtml(c.requirement)}</div>
        </div>
      </div>
    `).join('') + `</div>`;
    challengesRoot.querySelectorAll('[data-challenge]').forEach((row) => {
      row.addEventListener('click', () => toggleChallenge(row.dataset.challenge));
    });
  }

  renderHeader();
  renderTabs();
  renderChallenges();
})();
