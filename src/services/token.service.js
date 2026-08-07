const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const idOf = (user) => user._id ?? user.id;

module.exports = {
  signAccess: (user) =>
    jwt.sign(
      { sub: String(idOf(user)), role: user.role, academyId: user.academy ?? null },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_TTL },
    ),

  signRefresh: (user) =>
    jwt.sign({ sub: String(idOf(user)), type: 'refresh' }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_TTL,
    }),

  verifyAccess: (token) => jwt.verify(token, env.JWT_ACCESS_SECRET),
  verifyRefresh: (token) => jwt.verify(token, env.JWT_REFRESH_SECRET),
};
