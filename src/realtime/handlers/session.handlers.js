const rooms = require('../roomManager');
const { Session } = require('../../models');

const room = (code) => `session:${code}`;
const isStudent = (socket) => socket.data.role === 'student';

// Live-mirror: the tutor's UI activity is broadcast to every student in the room
// so they see the same pointer, hovers and highlights WITHOUT screen sharing.
module.exports = function registerSessionHandlers(io, socket) {
  // Tutor opens the live room.
  socket.on('session:host', ({ code, expiresAt } = {}, ack) => {
    if (isStudent(socket)) return ack?.({ ok: false, error: 'forbidden' });
    if (!code) return ack?.({ ok: false, error: 'bad_request' });
    rooms.create(code, socket.id, expiresAt);
    socket.join(room(code));
    socket.data.sessionCode = code;
    return ack?.({ ok: true });
  });

  // Student joins with the shared code. The student's disposable token (from the
  // handshake) is validated against the DB session so a guessed code alone can't
  // join — the private link carries the matching token.
  socket.on('session:join', async ({ code } = {}, ack) => {
    const r = rooms.get(code);
    if (!r) return ack?.({ ok: false, error: 'not_found' });
    if (rooms.isExpired(r)) {
      rooms.destroy(code);
      return ack?.({ ok: false, error: 'expired' });
    }
    try {
      const s = await Session.findOne({ code }).lean();
      if (!s || s.status !== 'active' || (s.expiresAt && Date.now() > new Date(s.expiresAt).getTime())) {
        return ack?.({ ok: false, error: 'expired' });
      }
      if (s.studentToken && socket.data.studentToken !== s.studentToken) {
        return ack?.({ ok: false, error: 'unauthorized' });
      }
    } catch (e) {
      return ack?.({ ok: false, error: 'server_error' });
    }
    socket.join(room(code));
    rooms.addStudent(code, socket.id);
    socket.data.sessionCode = code;
    io.to(r.hostSocketId).emit('session:student-joined', { socketId: socket.id });
    // The board goes out with the ack, same as the context: a student who joins
    // twenty minutes in must see the ink that is already on it, not a blank
    // board that only starts filling from their next stroke onwards. Highlights
    // and the tutor's chosen buddy ride along for the same reason.
    return ack?.({
      ok: true,
      context: r.context,
      board: rooms.getBoard(code),
      marks: rooms.getMarks(code),
      buddy: rooms.getBuddy(code),
    });
  });

  // Relay tutor → students for each live-mirror event.
  const MIRROR_EVENTS = [
    'session:cursor',
    'session:hover',
    'session:focus',
    'session:page',
    'session:scroll',
    'session:theme',
    'session:font',
    'session:tajweed',
    'session:context',
    'session:feedback',
    'session:mood', // tutor's emotional read on the lesson — mirrors to the student
    'session:board', // whiteboard ink — deliberately NOT volatile, see below
    'session:mark', // highlighter bands on the lesson — same contract as the board
    'session:buddy', // which child character the student sees, chosen by the tutor
  ];
  // High-frequency, disposable events: only the newest one has any value. Sent
  // volatile so that if a student's connection is momentarily backed up the
  // packet is DROPPED rather than queued — a queue of stale pointer positions
  // is exactly what makes a mirror feel laggy, because the student then plays
  // back the tutor's past movements in slow motion instead of skipping to now.
  //
  // session:board is the deliberate exception. Laser strokes are disposable —
  // losing one costs nothing because it was going to fade in a second anyway.
  // Whiteboard ink is permanent for the rest of the lesson, so a dropped packet
  // is a stroke the student never sees and the tutor has no way to know is
  // missing. It goes out reliably even if that means it queues behind a backed-
  // up connection.
  const VOLATILE_EVENTS = new Set(['session:cursor', 'session:hover', 'session:scroll']);

  MIRROR_EVENTS.forEach((event) => {
    socket.on(event, (payload) => {
      const code = socket.data.sessionCode;
      if (!code || isStudent(socket)) return; // only the tutor drives the mirror
      if (event === 'session:context') rooms.setContext(code, payload);
      if (event === 'session:board') rooms.applyBoard(code, payload);
      if (event === 'session:mark') rooms.applyMark(code, payload);
      if (event === 'session:buddy') rooms.setBuddy(code, payload?.buddy);
      const target = socket.to(room(code));
      // ...but a null cursor means "pointer left the stage" and must land, or
      // the student is left with a pointer frozen mid-page.
      if (VOLATILE_EVENTS.has(event) && payload) target.volatile.emit(event, payload);
      else target.emit(event, payload);
    });
  });

  // Tutor ends the session.
  socket.on('session:end', () => {
    const code = socket.data.sessionCode;
    if (!code || isStudent(socket)) return;
    io.to(room(code)).emit('session:ended');
    rooms.destroy(code);
  });

  // Clean up on disconnect.
  socket.on('disconnect', () => {
    const code = socket.data.sessionCode;
    if (!code) return;
    const r = rooms.get(code);
    if (!r) return;
    if (r.hostSocketId === socket.id) {
      io.to(room(code)).emit('session:ended');
      rooms.destroy(code);
    } else {
      rooms.removeStudent(code, socket.id);
    }
  });
};
