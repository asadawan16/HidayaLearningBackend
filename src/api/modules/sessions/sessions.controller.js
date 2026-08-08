const asyncHandler = require('../../../utils/asyncHandler');
const service = require('./sessions.service');

// Tutor creates a live session → gets the join code + student token to share.
const create = asyncHandler(async (req, res) => {
  const session = await service.createSession(req.user, req.body);
  res.status(201).json({
    success: true,
    data: {
      code: session.code,
      studentToken: session.studentToken,
      type: session.type,
      durationMin: session.durationMin,
      expiresAt: session.expiresAt,
      status: session.status,
    },
  });
});

// Public: a student resolves a session by code (no token leaked).
const getByCode = asyncHandler(async (req, res) => {
  const session = await service.getByCode(req.params.code);
  res.json({ success: true, data: service.publicView(session) });
});

const end = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await service.endSession(req.user, req.params.code)) });
});

const mine = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listMine(req.user) });
});

module.exports = { create, getByCode, end, mine };
