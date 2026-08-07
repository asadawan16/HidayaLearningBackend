const ApiError = require('../utils/ApiError');
const tokenService = require('../services/token.service');
const { User } = require('../models');

// Requires a valid Bearer access token; attaches the fresh user doc to req.user.
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Missing access token');

    const payload = tokenService.verifyAccess(token);
    const user = await User.findById(payload.sub).lean();
    if (!user || user.status === 'suspended') throw ApiError.unauthorized('Account not available');

    req.user = user;
    next();
  } catch (e) {
    next(e instanceof ApiError ? e : ApiError.unauthorized('Invalid or expired token'));
  }
};

module.exports = { authenticate };
