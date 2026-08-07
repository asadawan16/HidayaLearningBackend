const tokenService = require('../services/token.service');

// Sockets authenticate at the handshake with EITHER:
//   - a tutor/admin access token (full identity), or
//   - a student session token + code (opaque, validated on join).
module.exports = function socketAuth(socket, next) {
  const { accessToken, studentToken, sessionCode } = socket.handshake.auth || {};

  try {
    if (accessToken) {
      const payload = tokenService.verifyAccess(accessToken);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role; // tutor | academy_admin | admin | superadmin
      socket.data.academyId = payload.academyId;
      return next();
    }

    if (studentToken && sessionCode) {
      socket.data.role = 'student';
      socket.data.studentToken = studentToken;
      socket.data.sessionCode = sessionCode;
      return next();
    }

    return next(new Error('unauthorized'));
  } catch (e) {
    return next(new Error('unauthorized'));
  }
};
