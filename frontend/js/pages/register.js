(async function () {
  await NES.initShell(null);
  if (NES.getUser()) { window.location.href = '/pages/tracker.html'; return; }

  const form = document.getElementById('register-form');
  const errorEl = document.getElementById('form-error');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('show');

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (password !== confirmPassword) {
      errorEl.textContent = 'Passwords do not match.';
      errorEl.classList.add('show');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';
    try {
      await api.post('/auth/register', {
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        password,
        confirmPassword,
      });
      window.location.href = '/pages/tracker.html';
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign Up';
    }
  });
})();
