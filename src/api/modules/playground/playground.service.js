const crypto = require('crypto');
const ApiError = require('../../../utils/ApiError');
const { RewardGrant } = require('../../../models');

const genToken = () => crypto.randomBytes(18).toString('base64url');

// Tutor grants a time-boxed reward pass for the solo games.
async function grant(user, { durationMin = 15, games = [], studentName } = {}) {
  const now = new Date();
  return RewardGrant.create({
    token: genToken(),
    grantedBy: user._id,
    studentName,
    games,
    durationMin,
    grantedAt: now,
    expiresAt: new Date(now.getTime() + durationMin * 60000),
  });
}

// Public: a student resolves the reward token from the link.
async function resolve(token) {
  const g = await RewardGrant.findOne({ token }).lean();
  if (!g) throw ApiError.notFound('Reward not found');
  const remainingMs = new Date(g.expiresAt).getTime() - Date.now();
  return {
    status: remainingMs > 0 ? 'active' : 'expired',
    games: g.games || [],
    studentName: g.studentName || null,
    durationMin: g.durationMin,
    expiresAt: g.expiresAt,
    remainingMs: Math.max(0, remainingMs),
  };
}

module.exports = { grant, resolve };
