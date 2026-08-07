const { env } = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// Central error formatter. Normalizes Mongoose/Zod/native errors into ApiError
// shape so clients always get a consistent JSON body.
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    if (error.name === 'ValidationError') {
      error = new ApiError(400, 'Validation failed', error.errors);
    } else if (error.name === 'CastError') {
      error = new ApiError(400, `Invalid value for ${error.path}`);
    } else if (error.code === 11000) {
      error = new ApiError(409, 'Duplicate value', error.keyValue);
    } else {
      error = new ApiError(error.statusCode || 500, error.message || 'Internal server error');
    }
  }

  if (error.statusCode >= 500) logger.error(err);

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(env.NODE_ENV !== 'production' && error.statusCode >= 500 ? { stack: err.stack } : {}),
  });
};
