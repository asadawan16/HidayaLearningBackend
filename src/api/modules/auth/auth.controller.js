const asyncHandler = require('../../../utils/asyncHandler');
const service = require('./auth.service');

const login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body.email, req.body.password);
  res.json({ success: true, ...result });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await service.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
  res.json({ success: true, ...result });
});

const refresh = asyncHandler(async (req, res) => {
  const result = await service.refresh(req.body.refreshToken);
  res.json({ success: true, ...result });
});

module.exports = { login, me, changePassword, refresh };
