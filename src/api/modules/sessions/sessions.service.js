const crypto = require('crypto');
const ApiError = require('../../../utils/ApiError');
const { Session, Academy } = require('../../../models');

const genCode = () => crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 hex chars
const genToken = () => crypto.randomBytes(24).toString('base64url');

// Create a live-mirror session. Enforces the academy's concurrent-session cap
// (in-memory counters live in the socket layer; the durable check is here in the
// DB). A user without an academy (e.g. a superadmin testing) is unrestricted.
async function createSession(user, { durationMin = 30, type = 'live' } = {}) {
  if (user.academy) {
    const academy = await Academy.findById(user.academy).lean();
    if (!academy || academy.status !== 'approved') {
      throw ApiError.forbidden('Your academy is not approved for live sessions');
    }
    const max = academy.maxConcurrentSessions ?? 1;
    const active = await Session.countDocuments({
      academy: user.academy,
      status: 'active',
      expiresAt: { $gt: new Date() },
    });
    if (active >= max) {
      throw ApiError.conflict(`Concurrent live-session limit reached (${max}). End a session first.`);
    }
  }

  let code = genCode();
  for (let i = 0; i < 5 && (await Session.exists({ code })); i += 1) code = genCode();

  const now = new Date();
  return Session.create({
    host: user._id,
    academy: user.academy || undefined,
    type,
    code,
    studentToken: genToken(),
    durationMin,
    status: 'active',
    startedAt: now,
    expiresAt: new Date(now.getTime() + durationMin * 60000),
  });
}

// Resolve a session by code, lazily flipping it to `expired` once past expiresAt.
async function getByCode(code) {
  const s = await Session.findOne({ code: String(code).toUpperCase() }).lean();
  if (!s) throw ApiError.notFound('Session not found');
  if (s.status === 'active' && s.expiresAt && Date.now() > new Date(s.expiresAt).getTime()) {
    await Session.updateOne({ _id: s._id }, { status: 'expired', endedAt: new Date() });
    s.status = 'expired';
  }
  return s;
}

// Public projection for the student join screen — never leaks the studentToken
// (the token arrives via the private share link, not this endpoint).
function publicView(s) {
  return {
    code: s.code,
    type: s.type,
    status: s.status,
    durationMin: s.durationMin,
    expiresAt: s.expiresAt,
    context: s.context || null,
  };
}

async function endSession(user, code) {
  const s = await Session.findOne({ code: String(code).toUpperCase() });
  if (!s) throw ApiError.notFound('Session not found');
  const owner = String(s.host) === String(user._id);
  if (!owner && !['admin', 'superadmin'].includes(user.role)) {
    throw ApiError.forbidden('Not your session');
  }
  s.status = 'ended';
  s.endedAt = new Date();
  await s.save();
  return { success: true };
}

async function listMine(user) {
  return Session.find({ host: user._id }).sort('-createdAt').limit(20).lean();
}

module.exports = { createSession, getByCode, publicView, endSession, listMine };
