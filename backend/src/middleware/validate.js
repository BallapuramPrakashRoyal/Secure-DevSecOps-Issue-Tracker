/**
 * Wraps a Zod schema as Express middleware. Validates req.body (or the
 * specified source) and rejects malformed requests with a 400 before any
 * handler logic runs.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = { validate };
