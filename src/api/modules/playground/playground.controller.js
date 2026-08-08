const asyncHandler = require('../../../utils/asyncHandler');
const service = require('./playground.service');

const grant = asyncHandler(async (req, res) => {
  const g = await service.grant(req.user, req.body);
  res.status(201).json({
    success: true,
    data: { token: g.token, durationMin: g.durationMin, expiresAt: g.expiresAt, games: g.games },
  });
});

const resolve = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.resolve(req.params.token) });
});

module.exports = { grant, resolve };
