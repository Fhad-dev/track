const express = require('express');
const userService = require('../services/userService');
const { ApiError } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters');
const { isValidUsername, isValidPassword, isValidEmail } = require('../utils/validate');

const router = express.Router();

function regenerateSession(req, data) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      Object.assign(req.session, data);
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const { username, password, confirmPassword, email } = req.body || {};

    if (!isValidUsername(username)) {
      throw new ApiError(400, 'Username must be 3-20 characters: letters, numbers, underscores only.');
    }
    if (!isValidPassword(password)) {
      throw new ApiError(400, 'Password must be at least 8 characters.');
    }
    if (password !== confirmPassword) {
      throw new ApiError(400, 'Passwords do not match.');
    }
    if (!isValidEmail(email)) {
      throw new ApiError(400, 'Please enter a valid email address, or leave it blank.');
    }

    const user = await userService.createUser({ username, password, email });
    await regenerateSession(req, { userId: user.id });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) throw new ApiError(400, 'Username and password are required.');

    const user = await userService.verifyCredentials(username, password);
    await regenerateSession(req, { userId: user.id });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res, next) => {
  if (!req.session) return res.json({ ok: true });
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('nes.sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await userService.findById(req.session.userId);
    if (!user) throw new ApiError(401, 'Session invalid.');
    const { password_hash, failed_login_count, locked_until, ...safe } = user;
    res.json({ user: safe });
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body || {};
    if (!isValidPassword(newPassword)) throw new ApiError(400, 'New password must be at least 8 characters.');
    if (newPassword !== confirmNewPassword) throw new ApiError(400, 'New passwords do not match.');
    await userService.changePassword(req.session.userId, currentPassword, newPassword);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/account', requireAuth, async (req, res, next) => {
  try {
    const { password } = req.body || {};
    await userService.deleteAccount(req.session.userId, password);
    req.session.destroy(() => {
      res.clearCookie('nes.sid');
      res.json({ ok: true });
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
