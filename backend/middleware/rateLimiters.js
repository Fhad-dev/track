const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
  // Key by IP + attempted username so one bad actor can't lock out everyone
  // sharing a NAT'd IP, while still throttling per-account guessing.
  keyGenerator: (req) => `${req.ip}:${(req.body && req.body.username) || ''}`,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this location. Please try again later.' },
});

const globalLimiter = rateLimit({
  windowMs: Number(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.GLOBAL_RATE_LIMIT_MAX) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' },
});

module.exports = { loginLimiter, registerLimiter, globalLimiter };
