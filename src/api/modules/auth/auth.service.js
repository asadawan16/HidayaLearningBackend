const ApiError = require('../../../utils/ApiError');
const tokenService = require('../../../services/token.service');
const { User } = require('../../../models');

async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (user.status === 'suspended') throw ApiError.forbidden('Account suspended');

  const ok = await user.verifyPassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  user.lastLoginAt = new Date();
  await user.save();

  return {
    user: user.toJSON(),
    accessToken: tokenService.signAccess(user),
    refreshToken: tokenService.signRefresh(user),
    mustResetPassword: user.mustResetPassword,
  };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');

  const ok = await user.verifyPassword(currentPassword);
  if (!ok) throw ApiError.unauthorized('Current password is incorrect');

  await user.setPassword(newPassword);
  user.mustResetPassword = false;
  await user.save();
  return { success: true };
}

async function refresh(refreshToken) {
  const payload = tokenService.verifyRefresh(refreshToken);
  const user = await User.findById(payload.sub);
  if (!user || user.status === 'suspended') throw ApiError.unauthorized();
  return { accessToken: tokenService.signAccess(user) };
}

module.exports = { login, changePassword, refresh };
