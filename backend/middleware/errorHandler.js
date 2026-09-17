/**
 * ApiError - throw this from controllers/services for expected, user-facing
 * error conditions (validation, not found, forbidden, etc).
 */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;

  // Always log full detail server-side, but never send internals to the client.
  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  } else {
    // eslint-disable-next-line no-console
    console.warn('[warn]', err.message);
  }

  const payload = {
    error: statusCode >= 500 ? 'Something went wrong. Please try again.' : err.message || 'Request failed.',
  };
  if (err.details) payload.details = err.details;

  res.status(statusCode).json(payload);
}

module.exports = { ApiError, notFoundHandler, errorHandler };
