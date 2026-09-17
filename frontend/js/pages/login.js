(async function () {
  await NES.initShell(null);
  if (NES.getUser()) { window.location.href = '/pages/tracker.html'; return; }

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('form-error');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('show');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in…';
    try {
      await api.post('/auth/login', {
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value,
      });
      window.location.href = '/pages/tracker.html';
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
    }
  });
})();
