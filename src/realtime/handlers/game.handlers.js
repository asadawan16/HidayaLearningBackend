const room = (code) => `session:${code}`;

// Minimal live-game relay. Phase 4 adds server-authoritative rules/validation per
// game; for now the host is the authority and moves are relayed to the room.
module.exports = function registerGameHandlers(io, socket) {
  socket.on('game:move', ({ code, game, move } = {}) => {
    if (!code) return;
    socket.to(room(code)).emit('game:move', { game, move, by: socket.data.role });
  });

  socket.on('game:state', ({ code, game, state } = {}) => {
    if (!code || socket.data.role === 'student') return; // host owns authoritative state
    socket.to(room(code)).emit('game:state', { game, state });
  });
};
