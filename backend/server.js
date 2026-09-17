require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const { pool } = require('./database/pool');
const userService = require('./services/userService');
const { loadCurrentUser } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiters');

const authRoutes = require('./routes/auth');
const catalogRoutes = require('./routes/catalog');
const progressRoutes = require('./routes/progress');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Trust the first proxy hop (Nginx) so secure cookies / rate limiting see
// the real client IP in production.
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: isProd ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(compression());
app.use(cors({ origin: process.env.APP_URL || true, credentials: true }));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(cookieParser());
app.use(globalLimiter);

// ---------------------------------------------------------------------------
// Sessions - stored in Postgres, never in a JWT/localStorage.
// ---------------------------------------------------------------------------
app.use(
  session({
    store: new pgSession({ pool, tableName: 'sessions', createTableIfMissing: true }),
    name: 'nes.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: String(process.env.COOKIE_SECURE).toLowerCase() === 'true',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  })
);

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'replace_this_with_a_long_random_string') {
  // eslint-disable-next-line no-console
  console.warn('[server] WARNING: SESSION_SECRET is not set to a unique value. Set this before deploying.');
}

app.use(loadCurrentUser(userService));

// ---------------------------------------------------------------------------
// Static assets (camo images + frontend)
// ---------------------------------------------------------------------------
app.use('/assets', express.static(path.join(__dirname, '..', 'public', 'assets'), { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, '..', 'frontend'), { extensions: ['html'] }));

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// SPA-style fallback for frontend routes (non-/api, non-/assets paths)
app.get(/^(?!\/api|\/assets).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'index.html'));
});

app.use('/api', notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] NES COD Camo Tracker listening on port ${PORT} (${isProd ? 'production' : 'development'})`);
});

module.exports = app;
