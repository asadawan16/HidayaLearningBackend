const ApiError = require('../utils/ApiError');

// Validate/coerce req parts against zod schemas: validate({ body, query, params }).
// On success the parsed (coerced) value replaces the original.
module.exports = (schemas = {}) => (req, res, next) => {
  try {
    for (const key of ['body', 'query', 'params']) {
      if (schemas[key]) req[key] = schemas[key].parse(req[key]);
    }
    next();
  } catch (e) {
    next(ApiError.badRequest('Validation failed', e.errors || e.message));
  }
};
