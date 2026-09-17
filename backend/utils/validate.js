const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function isValidUsername(username) {
  return typeof username === 'string' && USERNAME_RE.test(username);
}

function isValidPassword(password) {
  // Minimum bar: 8+ chars. We rely on Argon2id for storage strength, but
  // still enforce a sane minimum length client- and server-side.
  return typeof password === 'string' && password.length >= 8 && password.length <= 256;
}

function isValidEmail(email) {
  if (email === undefined || email === null || email === '') return true; // optional
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && email.length <= 255 && re.test(email);
}

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function isSlug(value) {
  return typeof value === 'string' && /^[a-z0-9-]{1,96}$/.test(value);
}

/** Basic HTML-escaping for any user-supplied text ever reflected in output. */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { isValidUsername, isValidPassword, isValidEmail, isUuid, isSlug, escapeHtml };
