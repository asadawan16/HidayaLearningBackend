const { Server } = require('socket.io');
const { env } = require('../config/env');
const logger = require('../utils/logger');
const socketAuth = require('./socketAuth');
const registerSessionHandlers = require('./handlers/session.handlers');
const registerGameHandlers = require('./handlers/game.handlers');

// Attaches Socket.IO to the shared HTTP server. Transport order comes from
// SOCKET_TRANSPORTS (see config/env) — WebSocket first by default; hosts that
// restrict the WS upgrade set polling first. The client falls back on its own
// either way.
function attachRealtime(httpServer) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: env.CLIENT_ORIGINS, credentials: true },
    transports: env.SOCKET_TRANSPORTS,
    // Live-mirror packets are ~30 bytes. Deflating them costs more CPU than it
    // saves bandwidth, and CPU is the scarce resource on a shared/free dyno.
    perMessageDeflate: false,
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    logger.debug(`socket connected ${socket.id} role=${socket.data.role}`);
    registerSessionHandlers(io, socket);
    registerGameHandlers(io, socket);
    socket.on('disconnect', (reason) =>
      logger.debug(`socket ${socket.id} disconnected: ${reason}`));
  });

  return io;
}

module.exports = { attachRealtime };
