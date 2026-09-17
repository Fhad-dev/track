const NES = (() => {
  let currentUser = null;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function toast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast ${type === 'error' ? 'error' : ''}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  async function fetchCurrentUser() {
    try {
      const data = await api.get('/auth/me');
      currentUser = data.user;
    } catch {
      currentUser = null;
    }
    return currentUser;
  }

  function getUser() { return currentUser; }

  function renderNav(activePath) {
    const el = document.getElementById('nav-root');
    if (!el) return;

    const authLinks = currentUser
      ? `<a href="/pages/tracker.html" class="btn-ghost">My Tracker</a>
         <a href="/pages/profile.html?u=${encodeURIComponent(currentUser.username)}" class="btn-ghost">@${escapeHtml(currentUser.username)}</a>
         ${currentUser.is_admin ? '<a href="/pages/admin.html" class="btn-ghost">Admin</a>' : ''}
         <button id="logout-btn" class="btn btn-secondary">Log Out</button>`
      : `<a href="/pages/login.html" class="btn-ghost">Log In</a>
         <a href="/pages/register.html" class="btn btn-primary">Sign Up</a>`;

    el.innerHTML = `
      <nav class="nav">
        <div class="nav-inner">
          <a href="/pages/index.html" class="nav-logo">NES<span>.</span></a>
          <div class="nav-links">
            <a href="/pages/games.html" data-path="/pages/games.html">Games</a>
            <a href="/pages/tracker.html" data-path="/pages/tracker.html">My Tracker</a>
          </div>
          <div class="nav-search">
            <input type="text" id="global-search" placeholder="Search weapons, camos, games..." autocomplete="off" />
            <div class="nav-search-results" id="search-results"></div>
          </div>
          <div class="nav-actions">${authLinks}</div>
          <button class="hamburger" id="hamburger-btn" aria-label="Menu">&#9776;</button>
        </div>
      </nav>
      <div class="mobile-drawer" id="mobile-drawer">
        <div class="mobile-drawer-panel">
          <a href="/pages/games.html">Games</a>
          <a href="/pages/tracker.html">My Tracker</a>
          ${currentUser
            ? `<a href="/pages/profile.html?u=${encodeURIComponent(currentUser.username)}">@${escapeHtml(currentUser.username)}</a>
               ${currentUser.is_admin ? '<a href="/pages/admin.html">Admin</a>' : ''}
               <button id="logout-btn-mobile">Log Out</button>`
            : `<a href="/pages/login.html">Log In</a><a href="/pages/register.html">Sign Up</a>`}
        </div>
      </div>
    `;

    el.querySelectorAll('.nav-links a').forEach((a) => {
      if (a.dataset.path === activePath) a.classList.add('active');
    });

    const logoutHandler = async () => {
      try {
        await api.post('/auth/logout');
      } catch { /* ignore */ }
      window.location.href = '/pages/index.html';
    };
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logoutHandler);
    const logoutBtnMobile = document.getElementById('logout-btn-mobile');
    if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', logoutHandler);

    const hamburger = document.getElementById('hamburger-btn');
    const drawer = document.getElementById('mobile-drawer');
    if (hamburger && drawer) {
      hamburger.addEventListener('click', () => drawer.classList.add('open'));
      drawer.addEventListener('click', (e) => { if (e.target === drawer) drawer.classList.remove('open'); });
    }

    setupSearch();
  }

  function setupSearch() {
    const input = document.getElementById('global-search');
    const results = document.getElementById('search-results');
    if (!input || !results) return;
    let debounceTimer;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const term = input.value.trim();
      if (term.length < 2) { results.classList.remove('open'); results.innerHTML = ''; return; }
      debounceTimer = setTimeout(async () => {
        try {
          const data = await api.get(`/search?q=${encodeURIComponent(term)}`);
          const items = [...data.weapons.map((w) => ({
            label: w.name, meta: `${w.game_name} • ${w.category_label}`,
            href: `/pages/weapon.html?id=${w.id}`,
          })), ...data.masteryMatches.map((m) => ({
            label: `${m.name} — ${m.mastery_label}`, meta: m.game_name,
            href: `/pages/weapon.html?id=${m.id}`,
          }))];
          if (items.length === 0) {
            results.innerHTML = `<div class="result"><span>No matches found.</span></div>`;
          } else {
            results.innerHTML = items.map((it) => `
              <a class="result" href="${it.href}">
                <span>${escapeHtml(it.label)}</span>
                <span class="meta">${escapeHtml(it.meta)}</span>
              </a>
            `).join('');
          }
          results.classList.add('open');
        } catch {
          results.classList.remove('open');
        }
      }, 250);
    });

    document.addEventListener('click', (e) => {
      if (!results.contains(e.target) && e.target !== input) results.classList.remove('open');
    });
  }

  function renderFooter() {
    const el = document.getElementById('footer-root');
    if (!el) return;
    el.innerHTML = `
      <footer class="footer">
        <div class="container">NES COD Camo Tracker — an independent, fan-made progress tracker. Not affiliated with Activision.</div>
      </footer>
    `;
  }

  function requireAuthRedirect() {
    if (!currentUser) {
      window.location.href = '/pages/login.html';
      return false;
    }
    return true;
  }

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  async function initShell(activePath) {
    await fetchCurrentUser();
    renderNav(activePath);
    renderFooter();
  }

  return { toast, escapeHtml, fetchCurrentUser, getUser, renderNav, renderFooter, requireAuthRedirect, qs, initShell };
})();
