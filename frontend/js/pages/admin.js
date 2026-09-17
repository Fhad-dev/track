(async function () {
  await NES.initShell(null);
  const root = document.getElementById('admin-root');
  const user = NES.getUser();

  if (!user) {
    root.innerHTML = `<div class="state-block"><div class="icon">🔒</div><h3>Log in required</h3><a href="/pages/login.html" class="btn btn-primary">Log In</a></div>`;
    return;
  }
  if (!user.is_admin) {
    root.innerHTML = `<div class="state-block"><div class="icon">⛔</div><h3>Admins only</h3><p>Your account does not have admin privileges. Access is checked and enforced on the server for every request.</p></div>`;
    return;
  }

  let reference;
  try {
    reference = await api.get('/admin/reference');
  } catch (err) {
    root.innerHTML = `<div class="state-block"><div class="icon">⚠️</div><h3>Couldn't load admin data</h3><p>${NES.escapeHtml(err.message)}</p></div>`;
    return;
  }

  function gameOptions() {
    return reference.games.map((g) => `<option value="${g.id}" data-slug="${g.slug}">${NES.escapeHtml(g.name)} (${g.status})</option>`).join('');
  }
  function categoryOptions() {
    return reference.weaponCategories.map((c) => `<option value="${c.id}">${NES.escapeHtml(c.label)}</option>`).join('');
  }

  root.innerHTML = `
    <div class="grid" style="grid-template-columns: 1fr 1fr; align-items:start;">
      <div class="card">
        <h3 style="margin-top:0;">Add / Update Game</h3>
        <form id="game-form">
          <div class="form-field"><label>Slug (unique, e.g. "mw2019")</label><input id="g-slug" required pattern="[a-z0-9-]+" /></div>
          <div class="form-field"><label>Name</label><input id="g-name" required /></div>
          <div class="form-field"><label>Short Name</label><input id="g-short" /></div>
          <div class="form-field"><label>Release Year</label><input id="g-year" type="number" /></div>
          <div class="form-field"><label>Accent Color</label><input id="g-accent" type="text" placeholder="#C9A24A" /></div>
          <div class="form-field"><label>Status</label>
            <select id="g-status" style="width:100%; background:var(--bg-elevated); color:var(--light); border:1px solid var(--border-strong); border-radius:6px; padding:11px;">
              <option value="active">Active</option>
              <option value="coming_soon">Coming Soon</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary">Save Game</button>
        </form>
        <div id="game-form-msg"></div>
      </div>

      <div class="card">
        <h3 style="margin-top:0;">Add Weapon</h3>
        <form id="weapon-form">
          <div class="form-field"><label>Game</label>
            <select id="w-game" style="width:100%; background:var(--bg-elevated); color:var(--light); border:1px solid var(--border-strong); border-radius:6px; padding:11px;">${gameOptions()}</select>
          </div>
          <div class="form-field"><label>Category</label>
            <select id="w-category" style="width:100%; background:var(--bg-elevated); color:var(--light); border:1px solid var(--border-strong); border-radius:6px; padding:11px;">${categoryOptions()}</select>
          </div>
          <div class="form-field"><label>Slug</label><input id="w-slug" required pattern="[a-z0-9-]+" /></div>
          <div class="form-field"><label>Name</label><input id="w-name" required /></div>
          <div class="form-field"><label>Image Path</label><input id="w-image" placeholder="/assets/camos/mw2019/kilo-141/weapon.webp" /></div>
          <button type="submit" class="btn btn-primary">Add Weapon</button>
        </form>
        <div id="weapon-form-msg"></div>
      </div>

      <div class="card">
        <h3 style="margin-top:0;">Add Camo Challenge</h3>
        <form id="challenge-form">
          <div class="form-field"><label>Weapon ID</label><input id="c-weapon-id" placeholder="paste weapon id" required /></div>
          <div class="form-field"><label>Name</label><input id="c-name" required /></div>
          <div class="form-field"><label>Requirement</label><input id="c-requirement" required /></div>
          <div class="form-field"><label>Category</label><input id="c-category" placeholder="base / special" value="base" /></div>
          <div class="form-field"><label>Sort Order</label><input id="c-order" type="number" value="0" /></div>
          <button type="submit" class="btn btn-primary">Add Challenge</button>
        </form>
        <div id="challenge-form-msg"></div>
      </div>

      <div class="card">
        <h3 style="margin-top:0;">Upload Camo Image</h3>
        <form id="upload-form">
          <div class="form-field"><label>Game Slug</label><input id="u-game-slug" required pattern="[a-z0-9-]+" /></div>
          <div class="form-field"><label>Weapon Slug</label><input id="u-weapon-slug" required pattern="[a-z0-9-]+" /></div>
          <div class="form-field"><label>Filename (no extension)</label><input id="u-filename" placeholder="gold" /></div>
          <div class="form-field"><label>Image File</label><input id="u-file" type="file" accept="image/webp,image/png,image/jpeg,image/avif" required /></div>
          <button type="submit" class="btn btn-primary">Upload</button>
        </form>
        <div id="upload-form-msg"></div>
      </div>
    </div>
  `;

  function showMsg(id, message, isError) {
    const el = document.getElementById(id);
    el.innerHTML = `<div class="${isError ? 'form-error' : 'form-success'} show" style="margin-top:14px;">${NES.escapeHtml(message)}</div>`;
  }

  document.getElementById('game-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const game = await api.post('/admin/games', {
        slug: document.getElementById('g-slug').value.trim(),
        name: document.getElementById('g-name').value.trim(),
        shortName: document.getElementById('g-short').value.trim() || null,
        releaseYear: Number(document.getElementById('g-year').value) || null,
        accentColor: document.getElementById('g-accent').value.trim() || undefined,
        status: document.getElementById('g-status').value,
        sortOrder: reference.games.length,
      });
      reference.games.push(game.game);
      showMsg('game-form-msg', `Saved "${game.game.name}".`, false);
      document.getElementById('w-game').innerHTML = gameOptions();
    } catch (err) {
      showMsg('game-form-msg', err.message, true);
    }
  });

  document.getElementById('weapon-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const weapon = await api.post('/admin/weapons', {
        gameId: document.getElementById('w-game').value,
        categoryId: document.getElementById('w-category').value,
        slug: document.getElementById('w-slug').value.trim(),
        name: document.getElementById('w-name').value.trim(),
        image: document.getElementById('w-image').value.trim() || null,
        sortOrder: 0,
      });
      showMsg('weapon-form-msg', `Added "${weapon.weapon.name}". Weapon ID: ${weapon.weapon.id}`, false);
    } catch (err) {
      showMsg('weapon-form-msg', err.message, true);
    }
  });

  document.getElementById('challenge-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const challenge = await api.post('/admin/challenges', {
        weaponId: document.getElementById('c-weapon-id').value.trim(),
        name: document.getElementById('c-name').value.trim(),
        requirement: document.getElementById('c-requirement').value.trim(),
        category: document.getElementById('c-category').value.trim() || 'base',
        sortOrder: Number(document.getElementById('c-order').value) || 0,
      });
      showMsg('challenge-form-msg', `Added challenge "${challenge.challenge.name}".`, false);
      e.target.reset();
    } catch (err) {
      showMsg('challenge-form-msg', err.message, true);
    }
  });

  document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('u-file');
    if (!fileInput.files[0]) return;
    const formData = new FormData();
    formData.append('gameSlug', document.getElementById('u-game-slug').value.trim());
    formData.append('weaponSlug', document.getElementById('u-weapon-slug').value.trim());
    formData.append('filename', document.getElementById('u-filename').value.trim());
    formData.append('image', fileInput.files[0]);
    try {
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData, credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      showMsg('upload-form-msg', `Uploaded to ${data.path}`, false);
    } catch (err) {
      showMsg('upload-form-msg', err.message, true);
    }
  });
})();
