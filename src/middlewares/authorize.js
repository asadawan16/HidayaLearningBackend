const ApiError = require('../utils/ApiError');

// Role gate. Use after authenticate: authorize('admin', 'superadmin').
module.exports = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (roles.length && !roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};
