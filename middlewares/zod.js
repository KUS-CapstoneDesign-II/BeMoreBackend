const { AppError } = require('../errors/AppError');

function toValidationError(result) {
  const issues = result.error?.issues || [];
  const errors = issues.map(i => ({ path: i.path.join('.'), code: i.code, message: i.message }));
  return new AppError('Validation failed', 400, 'VALIDATION_ERROR', { errors });
}

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return next(toValidationError(parsed));
    req.body = parsed.data;
    next();
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.params || {});
    if (!parsed.success) return next(toValidationError(parsed));
    req.params = parsed.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query || {});
    if (!parsed.success) return next(toValidationError(parsed));
    req.query = parsed.data;
    next();
  };
}

module.exports = { validateBody, validateParams, validateQuery };


