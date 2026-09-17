/**
 * requireAuth - blocks the request unless a valid session user is present.
 * Never trust any client-supplied user id/role; always read from req.session.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  return next();
}

/**
 * requireAdmin - must run AFTER a middleware that attaches req.user
 * (see loadCurrentUser). Re-checks the freshly loaded DB record, never
 * a value sent by the frontend or cached on the session alone.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.is_admin !== true) {
    return res.status(403).json({ error: 'Admin privileges required.' });
  }
  return next();
}

/**
 * loadCurrentUser - if a session exists, loads the fresh user row from the
 * database and attaches it as req.user. Attaches nothing if not logged in.
 * This guarantees admin/ownership checks always reflect current DB state.
 */
function loadCurrentUser(userService) {
  return async function (req, res, next) {
    try {
      if (req.session && req.session.userId) {
        const user = await userService.findById(req.session.userId);
        if (!user) {
          // Session points at a deleted user - invalidate it.
          req.session.destroy(() => {});
          return next();
        }
        req.user = user;
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { requireAuth, requireAdmin, loadCurrentUser };
