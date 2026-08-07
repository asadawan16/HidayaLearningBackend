const rooms = require('../roomManager');

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

  // Student joins with the shared code.
  socket.on('session:join', ({ code } = {}, ack) => {
    const r = rooms.get(code);
    if (!r) return ack?.({ ok: false, error: 'not_found' });
    if (rooms.isExpired(r)) {
      rooms.destroy(code);
      return ack?.({ ok: false, error: 'expired' });
    }
    socket.join(room(code));
    rooms.addStudent(code, socket.id);
    socket.data.sessionCode = code;
    io.to(r.hostSocketId).emit('session:student-joined', { socketId: socket.id });
    return ack?.({ ok: true, context: r.context });
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
  ];
  MIRROR_EVENTS.forEach((event) => {
    socket.on(event, (payload) => {
      const code = socket.data.sessionCode;
      if (!code || isStudent(socket)) return; // only the tutor drives the mirror
      if (event === 'session:context') rooms.setContext(code, payload);
      socket.to(room(code)).emit(event, payload);
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
