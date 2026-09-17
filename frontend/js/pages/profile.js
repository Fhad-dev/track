(async function () {
  await NES.initShell(null);
  const root = document.getElementById('profile-root');
  const username = NES.qs('u');

  if (!username) {
    if (NES.getUser()) { window.location.href = `/pages/profile.html?u=${encodeURIComponent(NES.getUser().username)}`; return; }
    window.location.href = '/pages/login.html';
    return;
  }

  let data;
  try {
    data = await api.get(`/profile/${encodeURIComponent(username)}`);
  } catch (err) {
    if (err.status === 403) {
      root.innerHTML = `<div class="state-block"><div class="icon">🔒</div><h3>This profile is private</h3></div>`;
    } else if (err.status === 404) {
      root.innerHTML = `<div class="state-block"><div class="icon">❓</div><h3>Profile not found</h3></div>`;
    } else {
      root.innerHTML = `<div class="state-block"><div class="icon">⚠️</div><h3>Couldn't load profile</h3><p>${NES.escapeHtml(err.message)}</p></div>`;
    }
    return;
  }

  const p = data.profile;
  document.title = `@${p.username} — NES Camo Tracker`;

  root.innerHTML = `
    <div class="page-header">
      <div class="eyebrow">NES PROFILE</div>
      <h1>@${NES.escapeHtml(p.username)}</h1>
    </div>

    <div class="card" style="margin-top:24px;">
      <div style="display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:10px;">
        <h2 style="margin:0;">Overall Camo Completion</h2>
        <span style="font-size:28px; font-weight:800;">${p.overallPercent}%</span>
      </div>
      <div class="progress-track" style="margin-top:14px;"><div class="progress-fill" style="width:${p.overallPercent}%;"></div></div>
      <div style="display:flex; gap:28px; margin-top:20px; flex-wrap:wrap;">
        <div><div style="color:var(--muted); font-size:12px;">Games Completed</div><div style="font-size:20px; font-weight:700;">${p.gamesCompletedCount} / ${p.gamesTotalCount}</div></div>
        <div><div style="color:var(--muted); font-size:12px;">Weapons Mastered</div><div style="font-size:20px; font-weight:700;">${p.weaponsCompleted}</div></div>
        ${p.favoriteGameSlug ? `<div><div style="color:var(--muted); font-size:12px;">Favorite Game</div><div style="font-size:16px; font-weight:700;">${NES.escapeHtml(p.favoriteGameSlug)}</div></div>` : ''}
      </div>
    </div>

    <div class="section-title">By Game</div>
    <div class="card" style="display:flex; flex-direction:column; gap:16px;">
      ${p.perGame.map((g) => `
        <div class="progress-row">
          <div class="label">${NES.escapeHtml(g.name.replace(/^Call of Duty:\s*/i, ''))}</div>
          <div class="progress-track"><div class="progress-fill" style="width:${g.percent}%; background:${g.accentColor};"></div></div>
          <div class="pct">${g.percent}%</div>
        </div>
      `).join('')}
    </div>

    ${p.isOwner ? `
      <div class="section-title">Settings</div>
      <div class="card" id="owner-settings">
        <div class="form-field" style="display:flex; align-items:center; gap:10px;">
          <input type="checkbox" id="public-toggle" ${p.isPublic ? 'checked' : ''} style="width:auto;" />
          <label for="public-toggle" style="margin:0;">Make my profile public</label>
        </div>
        <p style="color:var(--muted); font-size:12px; margin-top:6px;">When private, only you can see this page.</p>

        <hr style="border-color:var(--border); margin:20px 0;" />

        <h3 style="margin-top:0;">Change Password</h3>
        <div class="form-error" id="pw-error"></div>
        <div class="form-success" id="pw-success"></div>
        <form id="password-form">
          <div class="form-field"><label>Current Password</label><input type="password" id="current-password" required /></div>
          <div class="form-field"><label>New Password</label><input type="password" id="new-password" minlength="8" required /></div>
          <div class="form-field"><label>Confirm New Password</label><input type="password" id="confirm-new-password" minlength="8" required /></div>
          <button type="submit" class="btn btn-secondary">Update Password</button>
        </form>

        <hr style="border-color:var(--border); margin:20px 0;" />

        <h3 style="margin-top:0; color:var(--danger);">Delete Account</h3>
        <p style="color:var(--muted); font-size:13px;">This permanently deletes your account and all camo progress. This cannot be undone.</p>
        <div class="form-error" id="delete-error"></div>
        <form id="delete-form" style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap;">
          <div class="form-field" style="margin-bottom:0; flex:1; min-width:180px;"><label>Password</label><input type="password" id="delete-password" required /></div>
          <button type="submit" class="btn btn-danger">Delete Account</button>
        </form>
      </div>
    ` : ''}
  `;

  if (p.isOwner) {
    document.getElementById('public-toggle').addEventListener('change', async (e) => {
      try {
        await api.patch('/profile/me', { isPublic: e.target.checked });
        NES.toast(e.target.checked ? 'Profile is now public.' : 'Profile is now private.');
      } catch (err) {
        NES.toast(err.message, 'error');
        e.target.checked = !e.target.checked;
      }
    });

    document.getElementById('password-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('pw-error');
      const successEl = document.getElementById('pw-success');
      errorEl.classList.remove('show');
      successEl.classList.remove('show');
      try {
        await api.post('/auth/change-password', {
          currentPassword: document.getElementById('current-password').value,
          newPassword: document.getElementById('new-password').value,
          confirmNewPassword: document.getElementById('confirm-new-password').value,
        });
        successEl.textContent = 'Password updated.';
        successEl.classList.add('show');
        e.target.reset();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.add('show');
      }
    });

    document.getElementById('delete-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('delete-error');
      errorEl.classList.remove('show');
      if (!confirm('This will permanently delete your account and all progress. Continue?')) return;
      try {
        await api.del('/auth/account', { password: document.getElementById('delete-password').value });
        window.location.href = '/pages/index.html';
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.add('show');
      }
    });
  }
})();
