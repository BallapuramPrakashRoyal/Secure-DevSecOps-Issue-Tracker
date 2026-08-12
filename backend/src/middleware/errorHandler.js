/**
 * Centralized error handler. Never leaks stack traces, database error
 * internals, or secrets to the client — those are logged server-side only.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Resource not found' });
  }
  if (err.code && err.code.startsWith('P')) {
    return res.status(400).json({ error: 'Database request could not be processed' });
  }

  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  return res.status(status).json({ error: message });
}

function notFoundHandler(req, res) {
  return res.status(404).json({ error: 'Route not found' });
}

module.exports = { errorHandler, notFoundHandler };
